<?php

namespace App\Application;

use RuntimeException;

class AdvertisementRejected extends RuntimeException
{
    public function __construct(string $reason)
    {
        parent::__construct(match ($reason) {
            'pdf_scripts' => 'This PDF contains interactive scripts. Open it in a trusted PDF viewer, print it to a new PDF, and upload that copy.',
            'pdf_attachments' => 'This PDF contains embedded files. Export or print the advertisement pages to a new PDF without attachments, then upload that copy.',
            'pdf_password' => 'This PDF is password-protected. Upload an unlocked copy that you are authorized to use.',
            'page_limit' => 'This PDF has more than 50 pages. Split it into documents of 50 pages or fewer, then upload the advertisement.',
            'pixel_limit' => 'This image exceeds 20 megapixels. Resize it and upload it again.',
            'size_limit' => 'This file exceeds 10 MB. Reduce its size and upload it again.',
            'text_limit' => 'This document contains too much text. Split it into smaller documents and upload the relevant advertisement.',
            'unreadable' => 'No readable advertisement text was found. Upload a clearer scan or a PDF containing selectable text.',
            'invalid_pdf' => 'The PDF could not be read. Download the original again or print it to a new PDF and upload that copy.',
            default => 'The document could not be processed. Upload a fresh PDF, JPG or PNG copy.',
        });
    }
}
