<?php
/**
 * Приём заявок с форм сайта 53 east yoga → письмо Елене.
 * Защита: только POST с этого сайта, ловушка для ботов, лимит частоты по IP, проверка и обрезка полей,
 * без подстановки пользовательских данных в заголовки письма.
 * При переносе на WordPress заменяется обработчиком темы (admin-post.php + wp_mail).
 */
declare(strict_types=1);

ini_set('display_errors', '0'); // внутренние ошибки не показываем посетителю

const MAIL_TO      = 'elena.ostashenk@yandex.ru';
const MAIL_FROM    = 'no-reply@elena-53east-yoga.ru'; // ящик на домене сайта, иначе письма уйдут в спам
const RATE_LIMIT   = 5;    // заявок
const RATE_WINDOW  = 600;  // за 10 минут с одного IP

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    reply(405, ['ok' => false, 'error' => 'method']);
}

// Заявка должна прийти со страниц этого же сайта (защита от отправки чужими страницами).
// Сравниваем с адресом, на котором работает сайт, поэтому смена домена ничего не ломает.
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$host = strtolower((string) parse_url($origin, PHP_URL_HOST));
$self = strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
if ($host === '' || $self === '' || $host !== $self) {
    reply(403, ['ok' => false, 'error' => 'origin']);
}

// Ловушка: поле скрыто от людей, боты его заполняют. Отвечаем «ок», чтобы бот не перебирал.
if (!empty($_POST['website'])) {
    reply(200, ['ok' => true]);
}

// Лимит частоты по IP (файл во временной папке, IP храним только в виде хэша)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$bucket = sys_get_temp_dir() . '/yoga53_' . hash('sha256', $ip . __FILE__) . '.json';
$now = time();
$hits = [];
if (is_file($bucket)) {
    $hits = array_filter((array) json_decode((string) file_get_contents($bucket), true), fn($t) => is_int($t) && $t > $now - RATE_WINDOW);
}
if (count($hits) >= RATE_LIMIT) {
    reply(429, ['ok' => false, 'error' => 'rate']);
}

// Работает и без расширения mbstring
function ulen(string $s): int {
    return function_exists('mb_strlen') ? mb_strlen($s) : (int) preg_match_all('/./us', $s);
}
function ucut(string $s, int $max): string {
    if (function_exists('mb_substr')) { return mb_substr($s, 0, $max); }
    return preg_match('/^.{0,' . $max . '}/us', $s, $m) ? $m[0] : '';
}

function field(string $key, int $max): string {
    $v = (string) ($_POST[$key] ?? '');
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    $v = trim($v);
    return ucut($v, $max);
}

$name    = field('name', 80);
$contact = field('contact', 80);
$email   = field('email', 120);
$topic   = field('topic', 80);
$tour    = field('tour', 160);
$people  = field('people', 40);
$message = field('message', 2000);
$page    = field('page', 200);
$consent = ($_POST['consent'] ?? '') === '1';

if (ulen($name) < 2 || ulen($contact) < 2 || !$consent) {
    reply(422, ['ok' => false, 'error' => 'fields']);
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(422, ['ok' => false, 'error' => 'email']);
}

$lines = [
    'Новая заявка с сайта 53 east yoga',
    '',
    'Страница: ' . $page,
    'Тема: ' . ($topic !== '' ? $topic : '—'),
];
if ($tour !== '')   { $lines[] = 'Тур: ' . $tour; }
if ($people !== '') { $lines[] = 'Участников: ' . $people; }
$lines[] = 'Имя: ' . $name;
$lines[] = 'Телефон или мессенджер: ' . $contact;
if ($email !== '')  { $lines[] = 'Email: ' . $email; }
$lines[] = '';
$lines[] = 'Сообщение:';
$lines[] = $message !== '' ? $message : '—';
$lines[] = '';
$lines[] = 'Согласие на обработку персональных данных: да, ' . date('d.m.Y H:i');

$subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . ($topic !== '' ? $topic : 'вопрос')) . '?=';
$headers = [
    'From: =?UTF-8?B?' . base64_encode('Сайт 53 east yoga') . '?= <' . MAIL_FROM . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];
// Reply-To только если адрес прошёл проверку: переводы строк в нём невозможны
if ($email !== '') {
    $headers[] = 'Reply-To: ' . $email;
}

$sent = @mail(MAIL_TO, $subject, implode("\r\n", $lines), implode("\r\n", $headers));
if (!$sent) {
    reply(500, ['ok' => false, 'error' => 'mail']);
}

$hits[] = $now;
@file_put_contents($bucket, json_encode(array_values($hits)), LOCK_EX);
reply(200, ['ok' => true]);
