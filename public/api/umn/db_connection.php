<?php

$env_path = '../../etc/env.ini';
$remoteuser = 'devuser';
// $remoteuser = $_SERVER[ 'REMOTE_USER' ];
// $db_temp = "cse_doenet";

if (
    $_SERVER['HTTP_HOST'] == 'localhost' ||
    $_SERVER['HTTP_HOST'] == 'localhost:3000' ||
    $_SERVER['HTTP_HOST'] == 'localhost:8080' ||
    $_SERVER['HTTP_HOST'] == 'apache' ||
    $_SERVER['HTTP_HOST'] == 'localhost:81'
) {
    $env_path = 'env.ini';
    $remoteuser = 'devuser';
}

$ini_array = parse_ini_file($env_path);

$dbhost = $ini_array['dbhost'];
$username = $ini_array['username'];
$password = $ini_array['password'];
$database = $ini_array['database'];

if (
    $_SERVER['HTTP_HOST'] == 'localhost' ||
    $_SERVER['HTTP_HOST'] == 'localhost:8080' ||
    $_SERVER['HTTP_HOST'] == 'apache' ||
    $_SERVER['HTTP_HOST'] == 'localhost:81'
) {
    $database = 'doenet_local';
    $dbhost = 'mysql';
    $_SERVER['givenName'] = "chocolate";  //For shib test on localhost
    $_SERVER['surname'] = "eclair"; //For shib test on localhost
    $_SERVER['mail'] = "eclair@doenet.org"; //For shib test on localhost
}

if ($_SERVER['HTTP_HOST'] == 'localhost:3000') {
    $dbhost = '127.0.0.1';
    $password = 'root';
}


// The legacy code relies on failed queries (e.g., duplicate-key inserts) returning
// false rather than throwing, which became the default in PHP 8.1.
mysqli_report(MYSQLI_REPORT_OFF);

$conn = new mysqli();


// Note: use MYSQLI_CLIENT_FOUND_ROWS
// so that can check rows_affected to determine if UPDATE queries match any records
// even if they didn't change any records
if (!$conn->real_connect($dbhost, $username, $password, $database, 3306, null, MYSQLI_CLIENT_FOUND_ROWS)) {
    die('Database Connection failed: ' . mysqli_connect_error());
}

?>
