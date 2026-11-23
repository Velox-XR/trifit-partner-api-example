<?php
/**
 * Plugin Name: Velox Dress Me — PHP Example
 * Description: Native WordPress Partner API example. Shortcode: [velox_dress_me_php]. Preview by default.
 * Version: 0.3.4
 * Requires PHP: 8.1
 */
if (!defined('ABSPATH')) { exit; }

final class Velox_WP_Example {
    const COOKIE = 'velox_wp_visitor';
    static function config($name, $fallback = '') { return defined('VELOX_WP_'.$name) ? constant('VELOX_WP_'.$name) : $fallback; }
    static function live() { return self::config('LIVE', false) === true; }
    static function scope() { return substr(hash('sha256', self::config('API_URL').'|'.self::config('CLIENT_ID').'|'.self::config('APPLICATION_ID').'|'.self::config('ENVIRONMENT')), 0, 24); }
    static function key($id) { return 'velox_wp_'.self::scope().'_'.$id; }
    static function fail($message) { throw new RuntimeException($message); }
    static function save($id, $record) {
        $name = self::key('receipt_'.$id);
        if (get_option($name, null) === null) {
            if (!add_option($name, $record, '', false)) self::fail('Could not retain the request receipt.');
        } elseif (!update_option($name, $record, false) && get_option($name) !== $record) {
            self::fail('Could not retain the request receipt.');
        }
    }
    static function record($id, $owner) {
        if (!preg_match('/^[a-f0-9-]{36}$/D', (string)$id)) self::fail('Invalid request reference.');
        $r = get_option(self::key('receipt_'.$id));
        if (!$r || !hash_equals($r['owner'], $owner)) self::fail('Request not found for this visitor.');
        return $r;
    }
    static function owner() {
        $cookie = $_COOKIE[self::COOKIE] ?? '';
        $parts = explode('.', $cookie);
        if (count($parts) !== 3 || !preg_match('/^[a-f0-9]{48}$/D', $parts[0]) || !ctype_digit($parts[1]) || (int)$parts[1] < time()) return '';
        $signature = hash_hmac('sha256', $parts[0].'.'.$parts[1], wp_salt('auth'));
        return hash_equals($signature, $parts[2]) ? 'wp_'.hash('sha256', $parts[0]) : '';
    }
    static function csrf($owner) { return hash_hmac('sha256', 'csrf|'.$owner, wp_salt('nonce')); }
    static function permission($request) {
        $origin = $request->get_header('origin');
        $home = wp_parse_url(home_url());
        $expected = $home['scheme'].'://'.$home['host'].(isset($home['port']) ? ':'.$home['port'] : '');
        if ($request->get_method() !== 'GET' && $origin !== $expected) return new WP_Error('origin', 'Open this page on the website itself.', ['status'=>403]);
        if (str_ends_with($request->get_route(), '/session')) return true;
        $owner = self::owner();
        if (!$owner || !hash_equals(self::csrf($owner), $request->get_header('x-velox-csrf'))) return new WP_Error('session', 'Your visitor session expired. Reload the page.', ['status'=>403]);
        return true;
    }
    static function session() {
        $owner = self::owner();
        if (!$owner) {
            $value = bin2hex(random_bytes(24)).'.'.(time()+2*DAY_IN_SECONDS);
            $value .= '.'.hash_hmac('sha256', $value, wp_salt('auth'));
            setcookie(self::COOKIE, $value, ['expires'=>time()+2*DAY_IN_SECONDS, 'path'=>'/', 'secure'=>is_ssl(), 'httponly'=>true, 'samesite'=>'Strict']);
            $_COOKIE[self::COOKIE] = $value;
            $owner = self::owner();
        }
        return ['mode'=>self::live() ? 'live' : 'preview', 'integration'=>self::config('CLIENT_ID'), 'csrf'=>self::csrf($owner), 'active'=>get_option(self::key('active_'.$owner), null)];
    }
    static function request($url, $args, $binary = false) {
        $response = wp_safe_remote_request($url, array_merge(['timeout'=>25, 'redirection'=>0, 'limit_response_size'=>$binary ? 20*1024*1024 : 1024*1024], $args));
        if (is_wp_error($response)) self::fail('The service response is uncertain. Keep this request reference; do not submit it again.');
        $status = wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) self::fail('The service did not confirm this operation (HTTP '.intval($status).'). Keep the request reference for review.');
        return $response;
    }
    static function api($method, $path, $owner, $data = null, $key = '') {
        $base = rtrim(self::config('API_URL'), '/');
        if (wp_parse_url($base, PHP_URL_SCHEME) !== 'https') self::fail('Set the assigned HTTPS API URL on the server.');
        $headers = ['X-Velox-Client-Id'=>self::config('CLIENT_ID'), 'X-Velox-Integration-Key'=>self::config('KEY'), 'X-Velox-Subject'=>$owner, 'Accept'=>'application/json'];
        if ($key) $headers['Idempotency-Key'] = $key;
        $args = ['method'=>$method, 'headers'=>$headers];
        if ($data !== null) { $args['headers']['Content-Type']='application/json'; $args['body']=wp_json_encode($data); }
        $r = self::request($base.$path, $args);
        $body = json_decode(wp_remote_retrieve_body($r), true);
        if (!is_array($body)) self::fail('The service returned an unreadable response. Keep the original receipt.');
        return $body;
    }
    static function ready($owner) {
        if (!self::live()) self::fail('This installation is in preview mode. No API calls are enabled.');
        foreach (['API_URL','KEY','CLIENT_ID','APPLICATION_ID','ENVIRONMENT','STORAGE_HOSTS'] as $field) if (!self::config($field)) self::fail('The server configuration is incomplete.');
        $cache = self::key('identity_'.substr(hash('sha256', self::config('KEY')),0,16));
        if (get_transient($cache)) return;
        $me = self::api('GET', '/me', $owner);
        if (($me['kind']??'') !== 'application' || ($me['id']??'') !== self::config('APPLICATION_ID') || ($me['clientId']??'') !== self::config('CLIENT_ID') || ($me['environment']??'') !== self::config('ENVIRONMENT')) self::fail('Partner identity or environment mismatch. No upload or generation was started.');
        set_transient($cache, true, 300);
    }
    static function storage($url) {
        $p = wp_parse_url($url);
        $hosts = self::config('STORAGE_HOSTS', []);
        if (!is_array($hosts) || ($p['scheme']??'') !== 'https' || !in_array(strtolower($p['host']??''), $hosts, true) || isset($p['user']) || isset($p['pass']) || (isset($p['port']) && $p['port'] !== 443)) self::fail('The returned media host is not in the assigned server allowlist.');
        return $url;
    }
    static function upload($request, $owner) {
        $role = $request->get_param('role');
        if (!in_array($role, ['personal','product'], true)) self::fail('Choose a photo or dress image.');
        if ($request->get_param('consent') !== 'yes') self::fail('Image permission is required.');
        $file = $request->get_file_params()['image'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) self::fail('Choose an image that fits the hosting upload limit.');
        $size = filesize($file['tmp_name']);
        $info = @getimagesize($file['tmp_name']);
        if (!$info || $size > 5*1024*1024 || $size < 1 || $info[0] > 8192 || $info[1] > 8192 || $info[0]*$info[1] > 16000000 || !in_array($info['mime'], ['image/jpeg','image/png','image/webp'], true)) self::fail('Use a JPEG, PNG or WebP up to 5 MB and 16 megapixels.');
        self::ready($owner);
        $id = $request->get_param('reference');
        if (!preg_match('/^[a-f0-9-]{36}$/D', (string)$id)) self::fail('Missing upload reference.');
        if (get_option(self::key('receipt_'.$id))) { $r=self::record($id,$owner); return ['reference'=>$id,'status'=>$r['status'],'assetId'=>$r['assetId']??null]; }
        $lock = self::key('upload_'.$owner.'_'.$role);
        if (!add_option($lock, $id, '', false)) self::fail('An earlier upload needs review. Keep its reference; a new upload was not started.');
        $r=['owner'=>$owner,'kind'=>'upload','role'=>$role,'status'=>'needs_review','created'=>time()];
        self::save($id,$r);
        try {
            $ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$info['mime']];
            $target=self::api('POST','/assets/upload-url',$owner,['role'=>$role,'fileName'=>$role.'.'.$ext,'contentType'=>$info['mime'],'sizeBytes'=>$size]);
            if (empty($target['assetId']) || empty($target['uploadUrl']) || !is_array($target['uploadHeaders']??null)) self::fail('Upload reservation was not confirmed.');
            $r['reservedAssetId']=$target['assetId']; self::save($id,$r);
            self::request(self::storage($target['uploadUrl']),['method'=>'PUT','headers'=>$target['uploadHeaders'],'body'=>file_get_contents($file['tmp_name'])]);
            $asset=self::api('POST','/assets/'.rawurlencode($r['reservedAssetId']).'/complete',$owner,new stdClass());
            if (empty($asset['id']) || ($asset['status']??'') !== 'ready') self::fail('Upload preparation was not confirmed.');
            $r['assetId']=$asset['id']; $r['status']='ready';
            if($role==='product') $r['preparationStatus']=$asset['preparation']['status']??'unknown';
            self::save($id,$r); delete_option($lock);
            return ['reference'=>$id,'status'=>'ready','assetId'=>$asset['id'],'preparationStatus'=>$r['preparationStatus']??null];
        } catch (Throwable $e) { self::save($id,$r); throw $e; }
    }
    static function submit($request,$owner) {
        self::ready($owner);
        if ($request->get_param('consent') !== true) self::fail('Image permission is required.');
        $id=$request->get_param('reference');
        if (!preg_match('/^[a-f0-9-]{36}$/D',(string)$id)) self::fail('Missing request reference.');
        $inputReferences=['personal'=>$request->get_param('personal'),'product'=>$request->get_param('product')];
        if (get_option(self::key('receipt_'.$id))) {
            $existing=self::record($id,$owner);
            if (($existing['inputReferences']??null)!==$inputReferences) self::fail('This request reference belongs to different inputs. Its original request was preserved.');
            return self::status($id,$owner);
        }
        $photo=self::record($request->get_param('personal'),$owner); $product=self::record($request->get_param('product'),$owner);
        if (($photo['role']??'')!=='personal' || ($product['role']??'')!=='product' || $photo['status']!=='ready' || $product['status']!=='ready') self::fail('Complete both image uploads first.');
        // A durable lock deliberately has no automatic expiry after an uncertain POST.
        if (!add_option(self::key('active_'.$owner),$id,'',false)) self::fail('An earlier try-on is still active. Check its status first.');
        $r=['owner'=>$owner,'kind'=>'job','status'=>'needs_review','created'=>time(),'inputReferences'=>$inputReferences,'payload'=>['personalAssetId'=>$photo['assetId'],'productAssetId'=>$product['assetId']],'idempotencyKey'=>$id];
        self::save($id,$r);
        $job=self::api('POST','/dressme/jobs',$owner,$r['payload'],$id);
        if (empty($job['id'])) self::fail('Submission outcome is uncertain. Keep the original request reference.');
        $r['jobId']=$job['id']; $r['status']='queued'; self::save($id,$r);
        return ['reference'=>$id,'status'=>'queued'];
    }
    static function status($id,$owner) {
        $r=self::record($id,$owner);
        if ($r['kind']!=='job') self::fail('This reference is not a try-on.');
        if (empty($r['jobId'])) return ['reference'=>$id,'status'=>'needs_review'];
        if (!in_array($r['status'],['succeeded','failed'],true)) {
            self::ready($owner);
            $job=self::api('GET','/dressme/jobs/'.rawurlencode($r['jobId']),$owner);
            if (!in_array($job['status']??'', ['queued','running','succeeded','failed'],true) || ($job['id']??'')!==$r['jobId']) self::fail('Unexpected job status. Keep the request reference.');
            if (!empty($job['simulated'])) self::fail('The API returned a simulated result. It cannot be shown as a real try-on.');
            $r['status']=$job['status'];
            if ($r['status']==='succeeded') {
                if (empty($job['result']['id'])) self::fail('Completed job has no result reference.');
                $r['resultAssetId']=$job['result']['id'];
                // The owner-authorized completion response already supplies temporary access.
                // Keep it server-side briefly; missing/expired access still uses normal renewal.
                $expires=is_string($job['result']['expiresAt']??null) ? strtotime($job['result']['expiresAt']) : false;
                if ($expires && $expires > time()+30 && is_string($job['result']['url']??null)) {
                    try {
                        $url=self::storage($job['result']['url']);
                        set_transient(self::key('result_access_'.$id), ['assetId'=>$r['resultAssetId'],'url'=>$url,'expires'=>$expires], min(60,$expires-time()));
                    } catch (RuntimeException $ignored) { /* Optional access hint: renew normally. */ }
                }
            }
            self::save($id,$r);
        }
        if (in_array($r['status'],['succeeded','failed'],true) && get_option(self::key('active_'.$owner))===$id) delete_option(self::key('active_'.$owner));
        $response=['reference'=>$id,'status'=>$r['status']];
        if ($r['status']==='succeeded') {
            $access=self::result_access($id,$owner);
            $response['resultUrl']=$access['url'];
        }
        return $response;
    }
    static function result_access($id,$owner) {
        self::ready($owner); $r=self::record($id,$owner);
        if ($r['kind']!=='job' || $r['status']!=='succeeded' || empty($r['resultAssetId'])) self::fail('A completed result is not available.');
        $access=get_transient(self::key('result_access_'.$id));
        if (is_array($access) && ($access['assetId']??'')===$r['resultAssetId'] && ($access['expires']??0)>time()+30 && is_string($access['url']??null)) {
            return ['id'=>$r['resultAssetId'],'url'=>self::storage($access['url'])];
        }
        $asset=self::api('GET','/assets/'.rawurlencode($r['resultAssetId']),$owner);
        if (($asset['id']??'')!==$r['resultAssetId'] || empty($asset['url'])) self::fail('Result access was not confirmed.');
        return ['id'=>$r['resultAssetId'],'url'=>self::storage($asset['url'])];
    }
    static function media($id,$owner) {
        $asset=self::result_access($id,$owner);
        $response=self::request(self::storage($asset['url']),['method'=>'GET'],true);
        $bytes=wp_remote_retrieve_body($response); $info=@getimagesizefromstring($bytes);
        if (!$info || strlen($bytes)>=20*1024*1024 || !in_array($info['mime'],['image/png','image/jpeg','image/webp'],true)) self::fail('The result is not a supported image.');
        // Base64 keeps authenticated media in a normal REST response. Browser converts to a private Blob.
        return ['mime'=>$info['mime'],'data'=>base64_encode($bytes)];
    }
    static function routes() {
        foreach (['session'=>'POST','upload'=>'POST','uploads/(?P<reference>[a-f0-9-]{36})'=>'GET','jobs'=>'POST','jobs/(?P<reference>[a-f0-9-]{36})'=>'GET','media/(?P<reference>[a-f0-9-]{36})'=>'GET'] as $path=>$method) {
            register_rest_route('velox-wp/v1','/'.$path,['methods'=>$method,'permission_callback'=>[self::class,'permission'],'callback'=>function($request) use($path) {
                try {
                    $owner=self::owner();
                    if ($path==='session') $result=self::session();
                    elseif ($path==='upload') $result=self::upload($request,$owner);
                    elseif ($path==='jobs') $result=self::submit($request,$owner);
                    elseif (str_starts_with($path,'uploads/')) { $r=self::record($request['reference'],$owner); if($r['kind']!=='upload') self::fail('This reference is not an upload.'); $result=['reference'=>$request['reference'],'status'=>$r['status'],'assetId'=>$r['assetId']??null]; }
                    elseif (str_starts_with($path,'media/')) $result=self::media($request['reference'],$owner);
                    else $result=self::status($request['reference'],$owner);
                    $response=new WP_REST_Response($result); $response->header('Cache-Control','private, no-store'); return $response;
                } catch (Throwable $e) { return new WP_Error('velox_request',$e instanceof RuntimeException ? $e->getMessage() : 'The operation needs review. Keep its request reference.',['status'=>409]); }
            }]);
        }
    }
    static function shortcode($attributes = []) {
        $attributes=shortcode_atts(['preview'=>'no'],$attributes);
        $previewOnly=$attributes['preview']==='yes';
        wp_enqueue_style('velox-wp-example',plugins_url('style.css',__FILE__),[], '0.3.4');
        wp_enqueue_script('velox-wp-example',plugins_url('app.js',__FILE__),[], '0.3.4',true);
        ob_start(); include __DIR__.'/view.php'; return ob_get_clean();
    }
}
add_action('rest_api_init',[Velox_WP_Example::class,'routes']);
add_shortcode('velox_dress_me_php',[Velox_WP_Example::class,'shortcode']);
