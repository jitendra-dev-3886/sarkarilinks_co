// Suggestions contain source text only. They never assert eligibility or verification.
export function suggestFields(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const headline = lines.slice(0, 8).join('\n');
  const patterns = [
    ['admit-cards', /admit\s*card|hall\s*ticket|प्रवेश\s*पत्र/iu],
    ['answer-keys', /answer\s*key|उत्तर\s*कुंजी/iu],
    ['results', /(?:final|exam|examination|recruitment)\s*result|merit\s*list|परिणाम|परीक्षाफल/iu],
    ['syllabus', /syllabus|पाठ्यक्रम/iu],
    ['schemes', /scheme|yojana|योजना/iu],
    ['jobs', /recruitment|vacanc(?:y|ies)|applications?\s+(?:are\s+)?invited|भर्ती|रिक्त/iu],
  ];
  const matches = patterns.filter(([, pattern]) => pattern.test(headline));
  const broader = patterns.filter(([, pattern]) => pattern.test(text));
  const candidates = matches.length ? matches : broader;
  const type = candidates.length === 1 ? candidates[0][0] : null;
  const pick = pattern => lines.filter(line => pattern.test(line)).join('\n');
  const closing = text.match(/(?:last\s*date|closing\s*date|अंतिम\s*तिथि)[^\n\d]{0,35}(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})/iu);
  let closingDate = null;
  if (closing) {
    const value = `${closing[3]}-${closing[2].padStart(2, '0')}-${closing[1].padStart(2, '0')}`;
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value) closingDate = value;
  }
  return {
    type, category_candidates: candidates.map(([name]) => name),
    title: lines.find(line => /recruitment|admit\s*card|result|syllabus|scheme|भर्ती|प्रवेश|योजना/iu.test(line))?.slice(0, 255) ?? lines[0]?.slice(0, 255) ?? '',
    organization: lines.find(line => /commission|department|ministry|board|university|bank|आयोग|विभाग|मंत्रालय/iu.test(line))?.slice(0, 255) ?? '',
    locale: /[\u0900-\u097f]/u.test(text) ? 'hi' : 'en',
    summary: lines.slice(0, 4).join(' ').slice(0, 2000), closing_date: closingDate,
    details: {
      vacancies: pick(/vacanc|total\s*posts|रिक्त|पदों/iu).slice(0, 2000),
      eligibility: pick(/eligib|qualification|age\s*limit|योग्यता|आयु/iu).slice(0, 10000),
      fees: pick(/(?:application|exam)\s*fee|शुल्क/iu).slice(0, 5000),
      important_dates: pick(/last\s*date|closing\s*date|opening\s*date|exam\s*date|तिथि|दिनांक/iu).slice(0, 10000),
      application_process: pick(/how\s*to\s*apply|apply\s*online|application\s*process|आवेदन/iu).slice(0, 10000),
      benefits: pick(/benefit|लाभ/iu).slice(0, 10000),
      exam_details: pick(/exam\s*(?:date|shift|duration|pattern)|परीक्षा/iu).slice(0, 10000),
    },
  };
}
