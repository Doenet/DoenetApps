<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: access");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

include "db_connection.php";
include "permissionsAndSettingsForOneCourseFunction.php";


$jwtArray = include "jwtArray.php";
$userId = $jwtArray['userId'];

$success = TRUE;
$message = "";


//Test Permission to edit content
if ($success){
$_POST = json_decode(file_get_contents("php://input"),true);
$doenetId =  mysqli_real_escape_string($conn,$_POST["doenetId"]);
$courseId = mysqli_real_escape_string($conn,$_POST["courseId"]);
$emailAddresses = array_map(function($item) use($conn) {
  return mysqli_real_escape_string($conn, $item);
}, $_POST['emailAddresses'] ?? []);


$permissions = permissionsAndSettingsForOneCourseFunction($conn,$userId,$courseId);
  if ($permissions["canEditContent"] != '1'){
    $success = FALSE;
    $message = "You need permission to edit the activity's settings.";
  }
}

$wasAssignedEmail = [];
$wasUnassignedEmail = [];
$emailToUserId = [];
$userIdToEmail = [];

if ($success){

  $sql = "SELECT 
    u.email,
    cu.userId
    FROM course_user AS cu
    LEFT JOIN user AS u 
    ON cu.userId = u.userId
    WHERE courseId = '$courseId'
    ";
  $result = $conn->query($sql); 
  if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()){
      $email = $row['email'];
      $userId = $row['userId'];
      $emailToUserId[$email] = $userId;
      $userIdToEmail[$userId] = $email;
    }
  }

  $sql = "SELECT 
    userId,
    isUnassigned
    FROM user_assignment 
    WHERE doenetId = '$doenetId'
    ";
  $result = $conn->query($sql); 
  if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()){
      $userId = $row['userId'];
      $email = $userIdToEmail[$userId];

      if ($row['isUnassigned'] == '0'){
        array_push($wasAssignedEmail,$email);
      }else{
        array_push($wasUnassignedEmail,$email);
      }
    }
  }

  //Assign 1/2
  //update isUnassigned to 0
  $have_rows_so_flip_to_assigned = array_intersect($emailAddresses,$wasUnassignedEmail);
  $userIds_to_assign = [];
  foreach($have_rows_so_flip_to_assigned AS $email_to_assign){
    array_push($userIds_to_assign,$emailToUserId[$email_to_assign]);
  }
  $sql_userIds = implode("','", $userIds_to_assign);
  $sql_userIds = "'" . $sql_userIds . "'";
    $sql = "UPDATE user_assignment
      SET isUnassigned = b'0'
      WHERE userId IN ($sql_userIds)
      AND doenetId = '$doenetId'
      ";
  $result = $conn->query($sql); 

  //Assign 2/2
  //Insert userId, doenetId and isUnassigned 0
  $need_to_be_inserted_emails = array_diff($emailAddresses,$have_rows_so_flip_to_assigned);
  $need_to_be_inserted_userIds = [];
  foreach($need_to_be_inserted_emails as $email_to_assign){
    array_push($need_to_be_inserted_userIds,$emailToUserId[$email_to_assign]);
  }
  foreach ($need_to_be_inserted_userIds as $assign_userid){
    $sql = "
    INSERT INTO user_assignment (doenetId,userId)
    VALUES
    ('$doenetId','$assign_userid')
    ";
    $result = $conn->query($sql); 
  }

  //Unassign
  //update isUnassigned to 1
  // $no_longer_assigned = array_diff($emailAddresses,$wasAssignedEmail);
  $no_longer_assigned_emails = array_diff($wasAssignedEmail,$emailAddresses);
  if (count($no_longer_assigned_emails) > 0){
  $userIds_to_unassign = [];
  foreach($no_longer_assigned_emails AS $email_to_unassign){
    array_push($userIds_to_unassign,$emailToUserId[$email_to_unassign]);
  }
  $sql_userIds = implode("','", $userIds_to_unassign);
  $sql_userIds = "'" . $sql_userIds . "'";
    $sql = "
    UPDATE user_assignment
    SET isUnassigned = b'1'
    WHERE userId IN ($sql_userIds)
    AND doenetId = '$doenetId'
    ";
  $result = $conn->query($sql); 

  }



}



$response_arr = array(
  "success"=>$success,
  "message"=>$message,
);


// set response code - 200 OK
http_response_code(200);

// make it json format
echo json_encode($response_arr);
$conn->close();

?>