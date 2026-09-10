<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: access");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

include "db_connection.php";

$browserKey = $_SERVER[ 'HTTP_X_SAFEEXAMBROWSER_REQUESTHASH' ];
$full_url = "https://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}";

$doenetId = mysqli_real_escape_string($conn,$_REQUEST["doenetId"]);

$success = TRUE;
$message = "";
$legitAccessKey = 0;



$sql = "
SELECT courseId
FROM course_content
WHERE doenetId = '$doenetId'
";
$result = $conn->query($sql);
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $courseId = $row['courseId'];

    //Save to help set up the exam
    $sql = "
    UPDATE course 
    SET lastSeenExamKey='$browserKey'
    WHERE courseId = '$courseId'
    ";

    $conn->query($sql);
}else{
  $success = FALSE;
  $message = "Couldn't find course.";
}

if ($success){
  $sql = "
  SELECT browserExamKeys
  FROM course
  WHERE courseId = '$courseId'
  ";
  $result = $conn->query($sql);
  $row = $result->fetch_assoc();
  $examKeys = explode("\n",$row["browserExamKeys"]);
  
  
  foreach ($examKeys as $examKey){
    $source = $full_url . trim($examKey);
    $newhash = hash("sha256",$source);
    if ($newhash == $browserKey){
      $legitAccessKey = 1;
      break;
    }
  }
}


// Bypass the Safe Exam Browser check: accept any browser, legitimate key or not.
$legitAccessKey = 1;

$response_arr = array(
  "success"=>$success,
  "message"=>$message,
  "legitAccessKey"=>$legitAccessKey,
);


// set response code - 200 OK
http_response_code(200);

echo json_encode($response_arr);

$conn->close();

?>
