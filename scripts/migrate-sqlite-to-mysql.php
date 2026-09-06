<?php

// Explicit local cutover: refuses an occupied target and retains the source and backups.
require __DIR__.'/../backend/vendor/autoload.php';
$app = require __DIR__.'/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

function ensure(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
function canonical(mixed $value): mixed
{
    if (is_array($value)) {
        if (! array_is_list($value)) {
            ksort($value);
        }
        return array_map('canonical', $value);
    }
    return $value;
}
function normalized(array $row, array $types): array
{
    foreach ($row as $column => $value) {
        if ($value === null) {
            continue;
        }
        $type = $types[$column];
        if ($type === 'json') {
            $row[$column] = canonical(json_decode($value, true, 512, JSON_THROW_ON_ERROR));
        } elseif ($type === 'date') {
            $row[$column] = (new DateTimeImmutable($value))->format('Y-m-d');
        } elseif (in_array($type, ['timestamp', 'datetime'])) {
            $row[$column] = (new DateTimeImmutable($value, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } else {
            $row[$column] = (string) $value;
        }
    }
    ksort($row);
    return $row;
}
function hashes(array $rows, array $types): array
{
    $hashes = array_map(fn ($row) => hash('sha256', json_encode(normalized((array) $row, $types), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)), $rows);
    sort($hashes);
    return $hashes;
}

$source = null;
$locked = false;
$switched = false;
try {
    ensure(in_array('--apply', $argv, true), 'Use --apply only after pausing this project and its workers.');
    ensure(config('database.default') === 'sqlite', 'Source must still be SQLite.');
    ensure($app->isDownForMaintenance(), 'Run artisan down and pause project workers first.');
    $credentials = json_decode(file_get_contents(storage_path('app/private/mysql-connection.json')), true, 512, JSON_THROW_ON_ERROR);
    $database = $credentials['database'];
    ensure((bool) preg_match('/^[a-zA-Z0-9_]+$/', $database), 'Unsafe database name.');
    ensure($credentials['username'] !== '', 'Authorized MySQL credentials are required.');
    $server = new PDO('mysql:host='.$credentials['host'].';port='.(int) $credentials['port'].';charset=utf8mb4', $credentials['username'], $credentials['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $check = $server->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?');
    $check->execute([$database]);
    ensure((int) $check->fetchColumn() === 0, 'Target already contains tables; nothing overwritten. Choose a new empty database.');
    ensure(DB::table('jobs')->whereNotNull('reserved_at')->count() === 0, 'A queue job is running.');
    ensure(DB::table('advertisement_imports')->where('status', 'processing')->count() === 0, 'An advertisement is processing.');
    ensure(DB::table('media_downloads')->where('status', 'processing')->count() === 0, 'A media job is processing.');
    $sourcePath = realpath(config('database.connections.sqlite.database'));
    ensure($sourcePath !== false, 'SQLite source is missing.');
    $stamp = gmdate('Ymd-His');
    $backup = storage_path('app/private/backups/mysql-cutover-'.$stamp);
    ensure(mkdir($backup, 0700, true), 'Could not create private backup directory.');
    ensure(copy(base_path('.env'), $backup.'/.env.sqlite'), 'Could not back up environment.');
    $source = DB::connection('sqlite')->getPdo();
    $source->exec('VACUUM INTO '.$source->quote($backup.'/database.sqlite'));
    $source->exec('BEGIN IMMEDIATE');
    $locked = true;
    ensure($source->query('PRAGMA foreign_key_check')->fetchAll() === [], 'Source contains broken foreign keys.');
    $tables = $source->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
    $server->exec('CREATE DATABASE IF NOT EXISTS `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    config(['database.connections.mysql.host' => $credentials['host'], 'database.connections.mysql.port' => $credentials['port'], 'database.connections.mysql.database' => $database, 'database.connections.mysql.username' => $credentials['username'], 'database.connections.mysql.password' => $credentials['password'], 'database.connections.mysql.url' => null, 'database.connections.mysql.timezone' => '+00:00']);
    DB::purge('mysql');
    ensure(Artisan::call('migrate', ['--database' => 'mysql', '--force' => true]) === 0, 'Target migrations failed.');
    $target = DB::connection('mysql');
    $target->statement('SET FOREIGN_KEY_CHECKS=0');
    $target->beginTransaction();
    $counts = [];
    foreach ($tables as $table) {
        ensure((bool) preg_match('/^[a-zA-Z0-9_]+$/', $table), 'Unexpected table name.');
        $columns = $target->select('SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema=? AND table_name=?', [$database, $table]);
        $types = [];
        foreach ($columns as $column) {
            $types[$column->COLUMN_NAME] = $column->DATA_TYPE;
        }
        ensure(count($types) > 0, 'Missing target table: '.$table);
        $rows = $source->query('SELECT * FROM "'.$table.'"')->fetchAll(PDO::FETCH_ASSOC);
        if ($target->table($table)->count() > 0) {
            // These rows were created by migrations in the previously empty target.
            $target->table($table)->delete();
        }
        foreach (array_chunk($rows, 100) as $chunk) {
            $converted = array_map(function ($row) use ($types) {
                foreach ($row as $column => $value) {
                    ensure(isset($types[$column]), 'Source column is absent from target.');
                    if ($value !== null && in_array($types[$column], ['timestamp', 'datetime'])) {
                        $row[$column] = (new DateTimeImmutable($value, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
                    } elseif ($value !== null && $types[$column] === 'date') {
                        $row[$column] = (new DateTimeImmutable($value))->format('Y-m-d');
                    }
                }
                return $row;
            }, $chunk);
            $target->table($table)->insert($converted);
        }
        $copied = $target->table($table)->get()->all();
        if (hashes($rows, $types) !== hashes($copied, $types)) {
            $different = [];
            foreach ($types as $column => $type) {
                $left = array_map(fn ($row) => json_encode(normalized([$column => $row[$column]], $types)), $rows);
                $right = array_map(fn ($row) => json_encode(normalized([$column => $row->$column], $types)), $copied);
                sort($left); sort($right);
                if ($left !== $right) $different[] = $column;
            }
            throw new RuntimeException('Data comparison failed: '.$table.' columns '.implode(',', $different));
        }
        $counts[$table] = count($rows);
    }
    $keys = $target->select('SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL', [$database]);
    foreach ($keys as $key) {
        $broken = $target->selectOne('SELECT COUNT(*) AS total FROM `'.$key->TABLE_NAME.'` c LEFT JOIN `'.$key->REFERENCED_TABLE_NAME.'` p ON c.`'.$key->COLUMN_NAME.'`=p.`'.$key->REFERENCED_COLUMN_NAME.'` WHERE c.`'.$key->COLUMN_NAME.'` IS NOT NULL AND p.`'.$key->REFERENCED_COLUMN_NAME.'` IS NULL');
        ensure((int) $broken->total === 0, 'Target foreign key verification failed.');
    }
    $target->commit();
    $target->statement('SET FOREIGN_KEY_CHECKS=1');
    $triggers = $target->selectOne("SELECT COUNT(*) AS total FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND TRIGGER_NAME IN ('audit_no_update','audit_no_delete')", [$database]);
    ensure((int) $triggers->total === 2, 'Audit protection triggers are missing.');
    $appUser = 'sl_co_'.gmdate('ymdHis');
    $appPassword = bin2hex(random_bytes(24));
    $account = $server->quote($appUser)."@'localhost'";
    $server->exec('CREATE USER '.$account.' IDENTIFIED BY '.$server->quote($appPassword));
    $server->exec('GRANT ALL PRIVILEGES ON `'.$database.'`.* TO '.$account);
    new PDO('mysql:host='.$credentials['host'].';port='.(int) $credentials['port'].';dbname='.$database, $appUser, $appPassword, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $env = file_get_contents(base_path('.env'));
    $settings = ['DB_CONNECTION' => 'mysql', 'DB_HOST' => $credentials['host'], 'DB_PORT' => (string) $credentials['port'], 'DB_DATABASE' => $database, 'DB_USERNAME' => $appUser, 'DB_PASSWORD' => $appPassword];
    foreach ($settings as $key => $value) {
        ensure(! preg_match('/[\r\n"\\\\]/', $value), 'Unexpected environment value.');
        $line = $key.'="'.$value.'"';
        $env = preg_match('/^'.preg_quote($key, '/').'=.*/m', $env) ? preg_replace_callback('/^'.preg_quote($key, '/').'=.*/m', fn () => $line, $env) : $env.PHP_EOL.$line.PHP_EOL;
    }
    $env = preg_replace('/^DB_URL=.*$/m', '# DB_URL intentionally unset for local MySQL', $env);
    $report = ['database' => $database, 'server_version' => $server->query('SELECT VERSION()')->fetchColumn(), 'tables' => $counts, 'checks' => ['row_hashes' => 'matched', 'foreign_keys' => 'valid', 'audit_triggers' => 2], 'backup' => $backup];
    file_put_contents($backup.'/verification.json', json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    ensure(file_put_contents(base_path('.env.mysql-pending'), $env) !== false, 'Could not prepare environment.');
    ensure(rename(base_path('.env.mysql-pending'), base_path('.env')), 'Could not switch environment.');
    $switched = true;
    $source->exec('COMMIT');
    $locked = false;
    // Remove the temporary administrative password; the runtime uses its database-scoped account.
    $credentials['username'] = $appUser;
    $credentials['password'] = $appPassword;
    file_put_contents(storage_path('app/private/mysql-connection.json'), json_encode($credentials, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
    echo "Cutover saved. Clear config, restart project workers, verify health and run artisan up.\n";
} catch (Throwable $exception) {
    if ($locked && $source) {
        $source->exec('ROLLBACK');
    }
    // Database exceptions can contain row values: do not print credentials or private records.
    fwrite(STDERR, 'Migration stopped: '.($exception instanceof RuntimeException && ! $exception instanceof PDOException && ! $exception instanceof Illuminate\Database\QueryException ? $exception->getMessage() : get_class($exception).' code '.$exception->getCode()).PHP_EOL);
    fwrite(STDERR, $switched ? "Environment switched; keep maintenance on until verification.\n" : "SQLite configuration retained. Target is isolated; inspect before retrying.\n");
    exit(1);
}
