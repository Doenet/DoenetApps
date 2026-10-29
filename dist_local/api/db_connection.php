<?php

$remoteuser = 'devuser';
// $remoteuser = $_SERVER[ 'REMOTE_USER' ];
// $db_temp = "cse_doenet";

$ini_array = parse_ini_file('../etc/env.ini');

if($ini_array == false) {
    http_response_code(500);
}

$dbhost = $ini_array['dbhost'];
$username = $ini_array['username'];
$password = $ini_array['password'];
$database = $ini_array['database'];
$mode = $ini_array['mode'];

if ($mode == 'development'
) {
    /*For shib test on localhost*/
    $_SERVER['givenName'] = "chocolate";  
    $_SERVER['surname'] = "eclair"; 
    $_SERVER['mail'] = "eclair@doenet.org"; 
}

// if ($_SERVER['HTTP_HOST'] == 'localhost:3000') {
//     $dbhost = '127.0.0.1';
//     $password = 'root';
// }


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
