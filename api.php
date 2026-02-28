<?php
// ==============================================================================
//  API PHP - Port fidele de server.js
// ==============================================================================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, x-session-id");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// --- CONFIG ---
$CONTENT_DIR        = __DIR__ . '/content';
$BLOG_DIR           = $CONTENT_DIR . '/blog';
$SERVICES_PAGES_DIR = $CONTENT_DIR . '/services_pages';
$IMAGES_DIR         = __DIR__ . '/uploads';
$LOCALES_DIR        = $CONTENT_DIR . '/locales';
$PRONUNCIATION_DIR  = $CONTENT_DIR . '/pronunciation';
$PRONUNCIATION_DB   = $PRONUNCIATION_DIR . '/history.json';
$PRONUNCIATION_LESSONS = $PRONUNCIATION_DIR . '/lessons.json';
$SESSIONS_FILE      = $CONTENT_DIR . '/sessions.json';
$NONCES_FILE        = $CONTENT_DIR . '/nonces.json';
$VALID_BLOG_LANGS   = array('fr', 'en', 'es', 'ar');
$RSS_SOURCES = array(
    array('name' => 'TV5MONDE - Apprendre le Francais', 'level' => 'A1-B2', 'url' => 'https://apprendre.tv5monde.com/fr/rss')
);

foreach (array($CONTENT_DIR, $BLOG_DIR, $SERVICES_PAGES_DIR, $IMAGES_DIR, $LOCALES_DIR, $PRONUNCIATION_DIR) as $dir) {
    if (!is_dir($dir)) mkdir($dir, 0777, true);
}

// Chargement .env
if (file_exists(__DIR__ . '/.env')) {
    foreach (file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $p = explode('=', $line, 2);
        if (count($p) === 2) putenv(trim($p[0]) . '=' . trim($p[1]));
    }
}
$ADMIN_PASSWORD = getenv('ADMIN_PASSWORD') ? getenv('ADMIN_PASSWORD') : 'Pascal';
$DEEPL_API_KEY  = getenv('DEEPL_API_KEY');
$EMAIL_USER     = getenv('EMAIL_USER');
$EMAIL_PASS     = getenv('EMAIL_PASS');
$EMAIL_TO       = getenv('EMAIL_TO') ? getenv('EMAIL_TO') : 'gamblin.aline@gmail.com';

// --- ROUTEUR ---
$routeParam = isset($_GET['_route']) ? $_GET['_route'] : '';
$route  = '/' . ltrim($routeParam, '/');
$method = $_SERVER['REQUEST_METHOD'];

// --- HELPERS GENERAUX ---
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return $raw ? json_decode($raw, true) : array();
}
function sendJson($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}
function secureRandomHex($bytes) {
    if (function_exists('random_bytes'))                return bin2hex(random_bytes($bytes));
    if (function_exists('openssl_random_pseudo_bytes')) return bin2hex(openssl_random_pseudo_bytes($bytes));
    $s = '';
    for ($i = 0; $i < $bytes * 2; $i++) $s .= dechex(mt_rand(0, 15));
    return $s;
}

// Replique exacte du simpleMD5() JavaScript (entiers 32 bits signes)
function simpleMD5($str) {
    $hash = 0;
    $len  = strlen($str);
    if ($len === 0) return '0';
    for ($i = 0; $i < $len; $i++) {
        $char = ord($str[$i]);
        $hash = ($hash * 32 - $hash + $char);
        $hash = $hash & 0xFFFFFFFF;
        if ($hash >= 0x80000000) $hash -= 0x100000000;
    }
    return dechex(abs($hash));
}

// --- SESSIONS (fichier JSON, expiry 24h) ---
function loadSessions() {
    global $SESSIONS_FILE;
    if (!file_exists($SESSIONS_FILE)) return array();
    return json_decode(file_get_contents($SESSIONS_FILE), true) ?: array();
}
function saveSessions($sessions) {
    global $SESSIONS_FILE;
    file_put_contents($SESSIONS_FILE, json_encode($sessions));
}
function getSession($sid) {
    if (!$sid) return null;
    $sessions = loadSessions();
    if (!isset($sessions[$sid])) return null;
    $s = $sessions[$sid];
    if (time() * 1000 > $s['expiresAt']) {
        unset($sessions[$sid]);
        saveSessions($sessions);
        return null;
    }
    return $s;
}
function createSession() {
    $sid = secureRandomHex(32);
    $now = time() * 1000;
    $sessions = loadSessions();
    $sessions[$sid] = array('createdAt' => $now, 'expiresAt' => $now + 86400000);
    saveSessions($sessions);
    return $sid;
}
function deleteSession($sid) {
    $sessions = loadSessions();
    unset($sessions[$sid]);
    saveSessions($sessions);
}
function getSid() {
    $headers = getallheaders();
    if (isset($headers['x-session-id']))  return $headers['x-session-id'];
    if (isset($headers['X-Session-Id']))  return $headers['X-Session-Id'];
    if (isset($_GET['sid']))              return $_GET['sid'];
    if (isset($_COOKIE['ident']))         return $_COOKIE['ident'];
    return null;
}
function isAdmin() {
    $sid = getSid();
    return $sid && getSession($sid) !== null;
}
function checkAuth() {
    if (!isAdmin()) sendJson(array('error' => 'Unauthorized: Please authenticate first'), 401);
}

// --- NONCES ---
function loadNonces() {
    global $NONCES_FILE;
    if (!file_exists($NONCES_FILE)) return array();
    $data = json_decode(file_get_contents($NONCES_FILE), true) ?: array();
    $now  = time();
    foreach ($data as $n => $ts) { if ($now - $ts > 120) unset($data[$n]); }
    return $data;
}
function saveNonces($nonces) {
    global $NONCES_FILE;
    file_put_contents($NONCES_FILE, json_encode($nonces));
}

// --- HELPERS MARKDOWN ---
function baseSlugOf($filename) {
    $noExt = pathinfo(basename($filename), PATHINFO_FILENAME);
    return preg_replace('/\.(fr|en|es|ar)$/', '', $noExt);
}
function langOf($filename) {
    $noExt = pathinfo(basename($filename), PATHINFO_FILENAME);
    if (preg_match('/\.(fr|en|es|ar)$/', $noExt, $m)) return $m[1];
    return 'fr';
}
function resolveFilePath($dir, $baseSlug, $lang) {
    global $VALID_BLOG_LANGS;
    $l = in_array($lang, $VALID_BLOG_LANGS) ? $lang : 'fr';
    foreach (array($dir.'/'.$baseSlug.'.'.$l.'.md', $dir.'/'.$baseSlug.'.fr.md', $dir.'/'.$baseSlug.'.md') as $f) {
        if (file_exists($f)) return $f;
    }
    return null;
}
function parseMDFile($filepath) {
    $filename = basename($filepath);
    $meta = array(
        'slug' => baseSlugOf($filename), 'lang' => langOf($filename),
        'title' => 'Untitled', 'author' => 'Unknown', 'date' => date('c'),
        'description' => '', 'image' => '/Logo_Solution.jpg',
        'published' => true, 'body' => ''
    );
    if (!file_exists($filepath)) return $meta;
    $raw     = file_get_contents($filepath);
    $content = str_replace("\r\n", "\n", $raw);
    if (preg_match('/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)/', $content, $fm)) {
        foreach (explode("\n", $fm[1]) as $line) {
            $cp = strpos($line, ':');
            if ($cp === false) continue;
            $key = trim(substr($line, 0, $cp));
            $val = trim(substr($line, $cp + 1));
            $val = preg_replace('/^["\']|["\']$/', '', $val);
            if ($key === '') continue;
            if ($key === 'published') { $meta['published'] = ($val === 'true'); }
            else { $meta[$key] = $val; }
        }
        $meta['body'] = trim($fm[2]);
    } else {
        $meta['body'] = trim($content);
    }
    return $meta;
}
function buildMDContent($title, $author, $date, $description, $image, $lang, $published, $body) {
    $pub = $published ? 'true' : 'false';
    return "---\ntitle: \"{$title}\"\nauthor: \"{$author}\"\ndate: \"{$date}\"\ndescription: \"{$description}\"\nimage: \"{$image}\"\nlang: \"{$lang}\"\npublished: {$pub}\n---\n\n{$body}";
}
function slugify($title) {
    $map = array(
        'a'=>'a','b'=>'b', // placeholder - real map below
    );
    $chars = array(
        'a','a','a','a','a', 'e','e','e','e', 'i','i','i','i',
        'o','o','o','o','o', 'u','u','u','u', 'c','n',
        'a','a','a','a','a', 'e','e','e','e', 'i','i',
        'o','o', 'u','u','u', 'c','n'
    );
    $search = array(
        'a','a','a','a','a','e','e','e','e','i','i','i','i',
        'o','o','o','o','o','u','u','u','u','c','n',
        'A','A','A','A','A','E','E','E','E','I','I',
        'O','O','U','U','U','C','N'
    );
    $accented = array(
        chr(0xC3).chr(0xA0), chr(0xC3).chr(0xA1), chr(0xC3).chr(0xA2), chr(0xC3).chr(0xA3), chr(0xC3).chr(0xA4),
        chr(0xC3).chr(0xA9), chr(0xC3).chr(0xA8), chr(0xC3).chr(0xAA), chr(0xC3).chr(0xAB),
        chr(0xC3).chr(0xAE), chr(0xC3).chr(0xAF), chr(0xC3).chr(0xAC), chr(0xC3).chr(0xAD),
        chr(0xC3).chr(0xB4), chr(0xC3).chr(0xB3), chr(0xC3).chr(0xB2), chr(0xC3).chr(0xB5), chr(0xC3).chr(0xB6),
        chr(0xC3).chr(0xB9), chr(0xC3).chr(0xBB), chr(0xC3).chr(0xBC), chr(0xC3).chr(0xBA),
        chr(0xC3).chr(0xA7), chr(0xC3).chr(0xB1),
        chr(0xC3).chr(0x80), chr(0xC3).chr(0x81), chr(0xC3).chr(0x82), chr(0xC3).chr(0x83), chr(0xC3).chr(0x84),
        chr(0xC3).chr(0x89), chr(0xC3).chr(0x88), chr(0xC3).chr(0x8A), chr(0xC3).chr(0x8B),
        chr(0xC3).chr(0x8E), chr(0xC3).chr(0x8F),
        chr(0xC3).chr(0x94), chr(0xC3).chr(0x93),
        chr(0xC3).chr(0x99), chr(0xC3).chr(0x9B), chr(0xC3).chr(0x9C),
        chr(0xC3).chr(0x87), chr(0xC3).chr(0x91)
    );
    $s = str_replace($accented, $search, strtolower($title));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim($s, '-');
}

// ============================================================
// ROUTES
// ============================================================

// --- RSS EXTERNE ---
if ($method === 'GET' && preg_match('#^/rss/?$#', $route)) {
    $results = array();
    foreach ($RSS_SOURCES as $source) {
        $items = array(); $hasError = false;
        if (function_exists('curl_init')) {
            $ch = curl_init($source['url']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $body = curl_exec($ch);
            $err  = curl_error($ch);
            curl_close($ch);
        } else {
            $ctx  = stream_context_create(array('http' => array('timeout' => 10, 'header' => "User-Agent: Mozilla/5.0\r\n")));
            $body = @file_get_contents($source['url'], false, $ctx);
            $err  = $body === false ? 'fetch failed' : '';
        }
        if ($body && !$err) {
            $prev = libxml_use_internal_errors(true);
            $xml  = simplexml_load_string($body);
            libxml_use_internal_errors($prev);
            if ($xml) {
                $count = 0;
                foreach ($xml->channel->item as $item) {
                    if ($count >= 5) break;
                    $items[] = array(
                        'title'   => (string)$item->title,
                        'link'    => (string)($item->link ? $item->link : $item->guid),
                        'pubDate' => (string)$item->pubDate,
                        'content' => (string)($item->description ? $item->description : '')
                    );
                    $count++;
                }
            } else { $hasError = true; }
        } else { $hasError = true; }
        $entry = array('source' => $source['name'], 'level' => $source['level'], 'items' => $items);
        if ($hasError) $entry['error'] = true;
        $results[] = $entry;
    }
    sendJson($results);
}

// --- AUTH ---
if ($method === 'GET' && preg_match('#^/auth/challenge/?$#', $route)) {
    $nonce  = secureRandomHex(16);
    $nonces = loadNonces();
    $nonces[$nonce] = time();
    saveNonces($nonces);
    sendJson(array('nonce' => $nonce));
}

if ($method === 'POST' && preg_match('#^/auth/verify/?$#', $route)) {
    $input = getJsonInput();
    $hash  = isset($input['hash'])  ? $input['hash']  : '';
    $nonce = isset($input['nonce']) ? $input['nonce'] : '';
    if (!$nonce || !$hash) sendJson(array('error' => 'Parametres manquants'), 400);
    $nonces = loadNonces();
    if (!isset($nonces[$nonce])) sendJson(array('error' => 'Defi expire ou invalide'), 401);
    unset($nonces[$nonce]);
    saveNonces($nonces);
    $expectedHash = simpleMD5($ADMIN_PASSWORD . $nonce);
    if ($hash === $expectedHash) {
        $sid = createSession();
        sendJson(array('success' => true, 'sessionId' => $sid));
    } else {
        sendJson(array('error' => 'Mot de passe incorrect'), 401);
    }
}

if ($method === 'GET' && preg_match('#^/auth/check/?$#', $route)) {
    if (!isAdmin()) sendJson(array('error' => 'Unauthorized: Please authenticate first'), 401);
    sendJson(array('success' => true));
}

if ($method === 'POST' && preg_match('#^/auth/logout/?$#', $route)) {
    $sid = getSid();
    if ($sid) deleteSession($sid);
    sendJson(array('success' => true));
}

// --- LOCALES ---
if ($method === 'GET' && preg_match('#^/locales/([^/]+)$#', $route, $m)) {
    $lang = basename($m[1]);
    if (!in_array($lang, array('fr','en','es','ar'))) sendJson(array('error' => 'Langue non supportee'), 400);
    $f = $LOCALES_DIR . '/' . $lang . '.json';
    if (file_exists($f)) { sendJson(json_decode(file_get_contents($f), true)); }
    else { sendJson(array('error' => 'Fichier introuvable'), 404); }
}
if ($method === 'PUT' && preg_match('#^/locales/([^/]+)$#', $route, $m)) {
    checkAuth();
    $lang = basename($m[1]);
    if (!in_array($lang, array('fr','en','es','ar'))) sendJson(array('error' => 'Langue non supportee'), 400);
    file_put_contents($LOCALES_DIR . '/' . $lang . '.json', json_encode(getJsonInput(), JSON_PRETTY_PRINT));
    sendJson(array('success' => true, 'message' => $lang . '.json sauvegarde'));
}

// --- TRANSLATE (DeepL) ---
if ($method === 'POST' && preg_match('#^/translate/?$#', $route)) {
    checkAuth();
    $input      = getJsonInput();
    $text       = isset($input['text'])       ? $input['text']       : '';
    $sourceLang = isset($input['sourceLang']) ? $input['sourceLang'] : '';
    $targetLang = isset($input['targetLang']) ? $input['targetLang'] : '';
    if (!$text || !$sourceLang || !$targetLang) sendJson(array('error' => 'text, sourceLang and targetLang are required'), 400);
    if (!$DEEPL_API_KEY) sendJson(array('error' => 'DeepL API key not configured'), 500);
    $mapSource = array('fr'=>'FR','en'=>'EN-US','es'=>'ES');
    $mapTarget = array('fr'=>'FR','en'=>'EN-US','es'=>'ES','ar'=>'AR');
    if (!isset($mapSource[$sourceLang])) sendJson(array('error' => "Language '{$sourceLang}' not supported as source"), 400);
    if (!isset($mapTarget[$targetLang])) sendJson(array('error' => "Language '{$targetLang}' not supported as target"), 400);
    if ($sourceLang === $targetLang)     sendJson(array('error' => 'Source and target languages must be different'), 400);
    $payload = json_encode(array('text' => array($text), 'source_lang' => $mapSource[$sourceLang], 'target_lang' => $mapTarget[$targetLang]));
    $ch = curl_init('https://api-free.deepl.com/v2/translate');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: DeepL-Auth-Key '.$DEEPL_API_KEY, 'Content-Type: application/json', 'User-Agent: Solution-FLE-Translator/1.0'));
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200) sendJson(array('error' => 'Translation service error: '.$resp), $code);
    $data = json_decode($resp, true);
    if (isset($data['translations'][0]['text'])) {
        sendJson(array('success' => true, 'translated' => $data['translations'][0]['text']));
    } else {
        sendJson(array('error' => 'Invalid response from translation service'), 500);
    }
}

// --- CONTACT ---
if ($method === 'POST' && preg_match('#^/contact/?$#', $route)) {
    $input   = getJsonInput();
    $name    = isset($input['name'])    ? trim($input['name'])    : '';
    $email   = isset($input['email'])   ? trim($input['email'])   : '';
    $message = isset($input['message']) ? trim($input['message']) : '';
    if (!$name || !$email || !$message) sendJson(array('error' => 'Tous les champs sont requis.'), 400);
    $subject = '[Solution FLE] Nouveau message de ' . $name;
    $body    = "Nom: {$name}\nEmail: {$email}\n\nMessage:\n{$message}";
    $headers = "From: {$EMAIL_USER}\r\nReply-To: {$email}\r\nContent-Type: text/plain; charset=utf-8";
    if (mail($EMAIL_TO, $subject, $body, $headers)) {
        sendJson(array('message' => 'Email envoye avec succes !'));
    } else {
        sendJson(array('error' => "Erreur technique lors de l'envoi"), 500);
    }
}

// --- BLOG ---
if ($method === 'GET' && preg_match('#^/blog/?$#', $route)) {
    $admin = isAdmin();
    $lang  = in_array(isset($_GET['lang']) ? $_GET['lang'] : '', $VALID_BLOG_LANGS) ? $_GET['lang'] : 'fr';
    $files = is_dir($BLOG_DIR) ? array_filter(scandir($BLOG_DIR), function($f) { return substr($f, -3) === '.md'; }) : array();
    $slugMap = array();
    foreach ($files as $f) {
        $base = baseSlugOf($f);
        $l    = langOf($f);
        if (!isset($slugMap[$base])) $slugMap[$base] = array();
        $slugMap[$base][$l] = $BLOG_DIR . '/' . $f;
    }
    $posts = array();
    foreach ($slugMap as $versions) {
        $fp   = isset($versions[$lang]) ? $versions[$lang] : (isset($versions['fr']) ? $versions['fr'] : reset($versions));
        $post = parseMDFile($fp);
        if ($admin || $post['published']) $posts[] = $post;
    }
    usort($posts, function($a, $b) { return strtotime($b['date']) - strtotime($a['date']); });
    sendJson($posts);
}

if ($method === 'GET' && preg_match('#^/blog/([^/]+)$#', $route, $m)) {
    $lang = in_array(isset($_GET['lang']) ? $_GET['lang'] : '', $VALID_BLOG_LANGS) ? $_GET['lang'] : 'fr';
    $fp   = resolveFilePath($BLOG_DIR, $m[1], $lang);
    if (!$fp) sendJson(array('error' => 'Article non trouve'), 404);
    sendJson(parseMDFile($fp));
}

if ($method === 'POST' && preg_match('#^/blog/?$#', $route)) {
    checkAuth();
    $input = getJsonInput();
    $title       = isset($input['title'])       ? $input['title']       : '';
    $author      = isset($input['author'])      ? $input['author']      : 'Aline Gamblin';
    $date        = isset($input['date'])        ? $input['date']        : date('Y-m-d');
    $description = isset($input['description']) ? $input['description'] : '';
    $image       = isset($input['image'])       ? $input['image']       : '/Logo_Solution.jpg';
    $body        = isset($input['body'])        ? $input['body']        : '';
    $published   = isset($input['published'])   ? (bool)$input['published'] : true;
    $lang        = in_array(isset($input['lang']) ? $input['lang'] : '', $VALID_BLOG_LANGS) ? $input['lang'] : 'fr';
    if (!$title || !$body || $body === 'undefined') sendJson(array('error' => 'Titre et contenu requis'), 400);
    $slug = slugify($title);
    $fp   = $BLOG_DIR . '/' . $slug . '.' . $lang . '.md';
    if (file_exists($fp)) sendJson(array('error' => 'Un article avec ce titre existe deja dans cette langue'), 409);
    file_put_contents($fp, buildMDContent($title, $author, $date, $description, $image, $lang, $published, $body));
    sendJson(array('success' => true, 'slug' => $slug, 'lang' => $lang, 'message' => "Article \"{$title}\" cree ({$lang})"), 201);
}

if ($method === 'PUT' && preg_match('#^/blog/([^/]+)$#', $route, $m)) {
    checkAuth();
    $slug  = $m[1];
    $input = getJsonInput();
    $title       = isset($input['title'])       ? $input['title']       : '';
    $author      = isset($input['author'])      ? $input['author']      : 'Aline Gamblin';
    $date        = isset($input['date'])        ? $input['date']        : date('Y-m-d');
    $description = isset($input['description']) ? $input['description'] : '';
    $image       = isset($input['image'])       ? $input['image']       : '/Logo_Solution.jpg';
    $body        = isset($input['body'])        ? $input['body']        : '';
    $published   = isset($input['published'])   ? (bool)$input['published'] : true;
    $lang        = in_array(isset($input['lang']) ? $input['lang'] : '', $VALID_BLOG_LANGS) ? $input['lang'] : 'fr';
    if (!$title || !$body || $body === 'undefined') sendJson(array('error' => 'Titre et contenu requis'), 400);
    $existingPath = resolveFilePath($BLOG_DIR, $slug, $lang);
    $targetPath   = $BLOG_DIR . '/' . $slug . '.' . $lang . '.md';
    if ($existingPath && $existingPath !== $targetPath && file_exists($existingPath)) rename($existingPath, $targetPath);
    file_put_contents($targetPath, buildMDContent($title, $author, $date, $description, $image, $lang, $published, $body));
    sendJson(array('success' => true, 'slug' => $slug, 'lang' => $lang, 'message' => "Article \"{$title}\" modifie ({$lang})"));
}

if ($method === 'DELETE' && preg_match('#^/blog/([^/]+)$#', $route, $m)) {
    checkAuth();
    $slug = $m[1];
    $lang = isset($_GET['lang']) ? $_GET['lang'] : 'fr';
    if ($lang === 'all') {
        foreach (array_merge($VALID_BLOG_LANGS, array('')) as $l) {
            $fp = $l ? $BLOG_DIR.'/'.$slug.'.'.$l.'.md' : $BLOG_DIR.'/'.$slug.'.md';
            if (file_exists($fp)) unlink($fp);
        }
    } else {
        $fp = resolveFilePath($BLOG_DIR, $slug, $lang);
        if (!$fp) sendJson(array('error' => 'Article non trouve'), 404);
        unlink($fp);
    }
    sendJson(array('success' => true, 'message' => 'Article supprime avec succes'));
}

// --- SERVICES PAGES ---
if ($method === 'GET' && preg_match('#^/services-pages/?$#', $route)) {
    $admin = isAdmin();
    $lang  = in_array(isset($_GET['lang']) ? $_GET['lang'] : '', $VALID_BLOG_LANGS) ? $_GET['lang'] : 'fr';
    $files = is_dir($SERVICES_PAGES_DIR) ? array_filter(scandir($SERVICES_PAGES_DIR), function($f) { return substr($f, -3) === '.md'; }) : array();
    $slugMap = array();
    foreach ($files as $f) {
        $base = baseSlugOf($f);
        $l    = langOf($f);
        if (!isset($slugMap[$base])) $slugMap[$base] = array();
        $slugMap[$base][$l] = $SERVICES_PAGES_DIR . '/' . $f;
    }
    $pages = array();
    foreach ($slugMap as $versions) {
        $fp   = isset($versions[$lang]) ? $versions[$lang] : (isset($versions['fr']) ? $versions['fr'] : reset($versions));
        $page = parseMDFile($fp);
        if ($admin || $page['published']) $pages[] = $page;
    }
    sendJson($pages);
}

if ($method === 'GET' && preg_match('#^/services-pages/([^/]+)$#', $route, $m)) {
    $lang = in_array(isset($_GET['lang']) ? $_GET['lang'] : '', $VALID_BLOG_LANGS) ? $_GET['lang'] : 'fr';
    $fp   = resolveFilePath($SERVICES_PAGES_DIR, $m[1], $lang);
    if (!$fp) sendJson(array('error' => 'Page non trouvee'), 404);
    sendJson(parseMDFile($fp));
}

if ($method === 'PUT' && preg_match('#^/services-pages/([^/]+)$#', $route, $m)) {
    checkAuth();
    $slug  = $m[1];
    $input = getJsonInput();
    $title     = isset($input['title'])     ? $input['title']     : '';
    $body      = isset($input['body'])      ? $input['body']      : '';
    $published = isset($input['published']) ? (bool)$input['published'] : true;
    $lang      = in_array(isset($input['lang']) ? $input['lang'] : '', $VALID_BLOG_LANGS) ? $input['lang'] : 'fr';
    if (!$title || !$body) sendJson(array('error' => 'Titre et contenu requis'), 400);
    $targetPath = $SERVICES_PAGES_DIR . '/' . $slug . '.' . $lang . '.md';
    $legacyPath = $SERVICES_PAGES_DIR . '/' . $slug . '.md';
    if (!file_exists($targetPath) && file_exists($legacyPath) && $lang === 'fr') rename($legacyPath, $targetPath);
    $pub = $published ? 'true' : 'false';
    file_put_contents($targetPath, "---\ntitle: \"{$title}\"\nlang: \"{$lang}\"\npublished: {$pub}\n---\n\n{$body}");
    sendJson(array('success' => true, 'message' => 'Page mise a jour'));
}

if ($method === 'DELETE' && preg_match('#^/services-pages/([^/]+)$#', $route, $m)) {
    checkAuth();
    $lang = isset($_GET['lang']) ? $_GET['lang'] : 'fr';
    $fp   = resolveFilePath($SERVICES_PAGES_DIR, $m[1], $lang);
    if (!$fp) sendJson(array('error' => 'Page introuvable'), 404);
    unlink($fp);
    sendJson(array('success' => true));
}

// --- IMAGES ---
if ($method === 'GET' && preg_match('#^/images/?$#', $route)) {
    checkAuth();
    $allowed = array('jpg','jpeg','png','gif','webp','svg');
    $files   = array();
    if (is_dir($IMAGES_DIR)) {
        foreach (scandir($IMAGES_DIR) as $f) {
            if (in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), $allowed)) {
                $files[] = array('name' => $f, 'url' => '/uploads/' . $f);
            }
        }
    }
    sendJson(array_reverse($files));
}

if ($method === 'POST' && preg_match('#^/images/upload/?$#', $route)) {
    checkAuth();
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) sendJson(array('error' => 'Aucun fichier valide'), 400);
    $allowedMime = array('image/jpeg','image/png','image/gif','image/webp','image/svg+xml');
    if (!in_array($_FILES['image']['type'], $allowedMime)) sendJson(array('error' => 'Type non autorise'), 400);
    if ($_FILES['image']['size'] > 5 * 1024 * 1024) sendJson(array('error' => 'Fichier trop volumineux (max 5 MB)'), 400);
    $ext      = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $safeName = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(pathinfo($_FILES['image']['name'], PATHINFO_FILENAME))), '-');
    $filename = $safeName . '-' . time() . '.' . $ext;
    move_uploaded_file($_FILES['image']['tmp_name'], $IMAGES_DIR . '/' . $filename);
    sendJson(array('success' => true, 'url' => '/uploads/' . $filename, 'name' => $filename));
}

// --- BACKUP ---
if ($method === 'GET' && preg_match('#^/admin/backup/?$#', $route)) {
    checkAuth();
    if (!class_exists('ZipArchive')) sendJson(array('error' => 'ZipArchive non disponible sur ce serveur'), 500);
    $zip     = new ZipArchive();
    $tmpFile = tempnam(sys_get_temp_dir(), 'backup_') . '.zip';
    if ($zip->open($tmpFile, ZipArchive::CREATE) !== true) sendJson(array('error' => 'Impossible de creer le ZIP'), 500);
    $dirMap = array('blog' => $BLOG_DIR, 'services_pages' => $SERVICES_PAGES_DIR, 'locales' => $LOCALES_DIR, 'uploads' => $IMAGES_DIR);
    foreach ($dirMap as $folder => $dir) {
        if (!is_dir($dir)) continue;
        foreach (scandir($dir) as $f) {
            if ($f === '.' || $f === '..') continue;
            $zip->addFile($dir . '/' . $f, $folder . '/' . $f);
        }
    }
    $zip->close();
    $filename = 'backup-solution-fle-' . date('Y-m-d') . '.zip';
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename=' . $filename);
    header('Content-Length: ' . filesize($tmpFile));
    readfile($tmpFile);
    unlink($tmpFile);
    exit();
}

// --- RESTORE ---
if ($method === 'POST' && preg_match('#^/admin/restore/?$#', $route)) {
    checkAuth();
    if (!class_exists('ZipArchive')) sendJson(array('error' => 'ZipArchive non disponible'), 500);
    if (!isset($_FILES['backup']) || $_FILES['backup']['error'] !== UPLOAD_ERR_OK) sendJson(array('error' => 'Aucun fichier ZIP fourni'), 400);
    $mode   = isset($_POST['mode']) && $_POST['mode'] === 'replace' ? 'replace' : 'merge';
    $dirMap = array('blog' => $BLOG_DIR, 'services_pages' => $SERVICES_PAGES_DIR, 'locales' => $LOCALES_DIR, 'uploads' => $IMAGES_DIR);
    $zip    = new ZipArchive();
    if ($zip->open($_FILES['backup']['tmp_name']) !== true) sendJson(array('error' => 'ZIP invalide'), 400);
    $restored = 0; $skipped = 0;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entry   = $zip->getNameIndex($i);
        $parts   = explode('/', $entry, 2);
        $folder  = $parts[0];
        $relPath = isset($parts[1]) ? $parts[1] : '';
        if (!isset($dirMap[$folder]) || !$relPath) { $skipped++; continue; }
        $targetPath = $dirMap[$folder] . '/' . $relPath;
        // Securite path traversal
        if (strpos(str_replace('\\', '/', $targetPath), str_replace('\\', '/', $dirMap[$folder]) . '/') !== 0) { $skipped++; continue; }
        if ($mode === 'merge' && file_exists($targetPath)) { $skipped++; continue; }
        file_put_contents($targetPath, $zip->getFromIndex($i));
        $restored++;
    }
    $zip->close();
    sendJson(array('success' => true, 'mode' => $mode, 'restored' => $restored, 'skipped' => $skipped, 'message' => "Restauration ({$mode}) : {$restored} fichier(s) importe(s), {$skipped} ignore(s)."));
}

// --- PRONONCIATION ---
if ($method === 'POST' && preg_match('#^/pronunciation/lesson/?$#', $route)) {
    $lessonName = isset($_POST['lessonName']) ? trim($_POST['lessonName']) : '';
    $editId     = isset($_POST['id'])         ? $_POST['id']              : null;
    if (!$lessonName) sendJson(array('error' => 'Nom de lecon requis.'), 400);
    $dbExt = file_exists($PRONUNCIATION_LESSONS) ? json_decode(file_get_contents($PRONUNCIATION_LESSONS), true) : array();
    if ($editId) {
        $found = false; $resultEntry = null;
        foreach ($dbExt as &$entry) {
            if ($entry['id'] === $editId) {
                $entry['lessonName'] = $lessonName;
                if (isset($_FILES['profAudio']) && $_FILES['profAudio']['error'] === UPLOAD_ERR_OK) {
                    move_uploaded_file($_FILES['profAudio']['tmp_name'], $PRONUNCIATION_DIR . '/' . basename($entry['audioUrl']));
                }
                $found = true; $resultEntry = $entry; break;
            }
        }
        unset($entry);
        if (!$found) sendJson(array('error' => 'Lecon non trouvee.'), 404);
    } else {
        if (!isset($_FILES['profAudio']) || $_FILES['profAudio']['error'] !== UPLOAD_ERR_OK) sendJson(array('error' => 'Audio requis pour une nouvelle lecon.'), 400);
        $safeName  = preg_replace('/\W+/', '-', $lessonName);
        $timestamp = time() . '000';
        $newId     = 'lesson_' . $safeName . '_' . $timestamp;
        $fileName  = $newId . '.wav';
        move_uploaded_file($_FILES['profAudio']['tmp_name'], $PRONUNCIATION_DIR . '/' . $fileName);
        $resultEntry = array('id' => $newId, 'timestamp' => date('c'), 'lessonName' => $lessonName, 'audioUrl' => '/api/pronunciation/audio/' . $fileName);
        $dbExt[] = $resultEntry;
    }
    file_put_contents($PRONUNCIATION_LESSONS, json_encode($dbExt, JSON_PRETTY_PRINT));
    sendJson(array('success' => true, 'entry' => $resultEntry));
}

if ($method === 'DELETE' && preg_match('#^/pronunciation/lesson/([^/]+)$#', $route, $m)) {
    checkAuth();
    $id = $m[1];
    $dbExt = file_exists($PRONUNCIATION_LESSONS) ? json_decode(file_get_contents($PRONUNCIATION_LESSONS), true) : array();
    $filtered = array(); $deleted = false;
    foreach ($dbExt as $e) {
        if ($e['id'] === $id) {
            if (isset($e['audioUrl'])) { $f = $PRONUNCIATION_DIR.'/'.basename($e['audioUrl']); if(file_exists($f)) unlink($f); }
            $deleted = true;
        } else { $filtered[] = $e; }
    }
    if (!$deleted) sendJson(array('error' => 'Introuvable'), 404);
    file_put_contents($PRONUNCIATION_LESSONS, json_encode($filtered, JSON_PRETTY_PRINT));
    sendJson(array('success' => true, 'message' => 'Lecon effacee'));
}

if ($method === 'GET' && preg_match('#^/pronunciation/lessons/?$#', $route)) {
    $dbExt = file_exists($PRONUNCIATION_LESSONS) ? json_decode(file_get_contents($PRONUNCIATION_LESSONS), true) : array();
    usort($dbExt, function($a, $b) { return strtotime($b['timestamp']) - strtotime($a['timestamp']); });
    sendJson($dbExt);
}

if ($method === 'POST' && preg_match('#^/pronunciation/save/?$#', $route)) {
    $lessonName  = trim(isset($_POST['lessonName'])  ? $_POST['lessonName']  : '');
    $studentName = trim(isset($_POST['studentName']) ? $_POST['studentName'] : '');
    $scores      = json_decode(isset($_POST['scores']) ? $_POST['scores'] : '{}', true);
    if (!$lessonName || !$studentName) sendJson(array('error' => "Noms de la lecon et de l'eleve requis."), 400);
    $id  = preg_replace('/\W+/', '-', $studentName) . '_' . preg_replace('/\W+/', '-', $lessonName);
    $ts  = time();
    $dbExt = file_exists($PRONUNCIATION_DB) ? json_decode(file_get_contents($PRONUNCIATION_DB), true) : array();
    $idx = -1;
    foreach ($dbExt as $i => $e) { if ($e['id'] === $id) { $idx = $i; break; } }
    $profPath = ''; $elevePath = '';
    if (isset($_FILES['profAudio']) && $_FILES['profAudio']['error'] === UPLOAD_ERR_OK) {
        $profPath = $id . '_prof_' . $ts . '.wav';
        move_uploaded_file($_FILES['profAudio']['tmp_name'], $PRONUNCIATION_DIR . '/' . $profPath);
    }
    if (isset($_FILES['eleveAudio']) && $_FILES['eleveAudio']['error'] === UPLOAD_ERR_OK) {
        $elevePath = $id . '_eleve_' . $ts . '.wav';
        move_uploaded_file($_FILES['eleveAudio']['tmp_name'], $PRONUNCIATION_DIR . '/' . $elevePath);
    }
    $oldProf  = ($idx !== -1) ? $dbExt[$idx]['profAudio']  : null;
    $oldEleve = ($idx !== -1) ? $dbExt[$idx]['eleveAudio'] : null;
    $entry = array(
        'id' => $id, 'timestamp' => date('c'), 'lessonName' => $lessonName, 'studentName' => $studentName, 'scores' => $scores,
        'profAudio'  => $profPath  ? '/api/pronunciation/audio/'.$profPath  : $oldProf,
        'eleveAudio' => $elevePath ? '/api/pronunciation/audio/'.$elevePath : $oldEleve
    );
    if ($idx !== -1) {
        if ($profPath  && $oldProf)  @unlink($PRONUNCIATION_DIR.'/'.basename($oldProf));
        if ($elevePath && $oldEleve) @unlink($PRONUNCIATION_DIR.'/'.basename($oldEleve));
        $dbExt[$idx] = $entry;
    } else { $dbExt[] = $entry; }
    file_put_contents($PRONUNCIATION_DB, json_encode($dbExt, JSON_PRETTY_PRINT));
    sendJson(array('success' => true, 'entry' => $entry));
}

if ($method === 'GET' && preg_match('#^/pronunciation/history/?$#', $route)) {
    $dbExt = file_exists($PRONUNCIATION_DB) ? json_decode(file_get_contents($PRONUNCIATION_DB), true) : array();
    usort($dbExt, function($a, $b) { return strtotime($b['timestamp']) - strtotime($a['timestamp']); });
    sendJson($dbExt);
}

if ($method === 'DELETE' && preg_match('#^/pronunciation/history/([^/]+)$#', $route, $m)) {
    checkAuth();
    $id = $m[1];
    $dbExt = file_exists($PRONUNCIATION_DB) ? json_decode(file_get_contents($PRONUNCIATION_DB), true) : array();
    $filtered = array(); $deleted = false;
    foreach ($dbExt as $e) {
        if ($e['id'] === $id) {
            if (isset($e['profAudio']))  @unlink($PRONUNCIATION_DIR.'/'.basename($e['profAudio']));
            if (isset($e['eleveAudio'])) @unlink($PRONUNCIATION_DIR.'/'.basename($e['eleveAudio']));
            $deleted = true;
        } else { $filtered[] = $e; }
    }
    if (!$deleted) sendJson(array('error' => 'Introuvable'), 404);
    file_put_contents($PRONUNCIATION_DB, json_encode($filtered, JSON_PRETTY_PRINT));
    sendJson(array('success' => true, 'message' => 'Efface'));
}

if ($method === 'GET' && preg_match('#^/pronunciation/audio/([^/]+)$#', $route, $m)) {
    $file = $PRONUNCIATION_DIR . '/' . basename($m[1]);
    if (file_exists($file)) { header('Content-Type: audio/wav'); header('Content-Length: '.filesize($file)); readfile($file); exit(); }
    sendJson(array('error' => 'Fichier non trouve'), 404);
}

// --- FALLBACK 404 ---
sendJson(array('error' => 'Route non trouvee: ' . $route), 404);