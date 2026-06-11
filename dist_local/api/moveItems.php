<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: access");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

include "db_connection.php";

$jwtArray = include "jwtArray.php";
$userId = $jwtArray['userId'];

$_POST = json_decode(file_get_contents("php://input"),true); 

$sourceDriveId = mysqli_real_escape_string($conn,$_POST["sourceDriveId"]); 
$destinationDriveId = mysqli_real_escape_string($conn,$_POST["destinationDriveId"]); 
$destinationItemId = mysqli_real_escape_string($conn,$_POST["destinationItemId"]); 
$newSortOrder = mysqli_real_escape_string($conn,$_POST["newSortOrder"]); 

$success = TRUE;
$message = "";

if ($sourceDriveId == ""){
  $success = FALSE;
  $message = 'Internal Error: missing sourceDriveId';
}elseif ($destinationDriveId == ""){
  $success = FALSE;
  $message = 'Internal Error: missing destinationDriveId';
}elseif ($destinationItemId == ""){
  $success = FALSE;
  $message = 'Internal Error: missing destinationItemId';
}elseif ($newSortOrder == ""){
  $success = FALSE;
  $message = 'Internal Error: missing newSortOrder';
}elseif ($userId == ""){
  $success = FALSE;
  $message = "You need to be signed in to move items";
}

//Test if user has permission to move source
if ($success){
  $sql = "
  SELECT canMoveItemsAndFolders
  FROM drive_user
  WHERE userId = '$userId'
  AND driveId = '$sourceDriveId'
  ";
  $result = $conn->query($sql); 
  $canMoveSource = FALSE;
  if ($result->num_rows > 0){
    $row = $result->fetch_assoc();
    $canMoveSource = $row["canMoveItemsAndFolders"];
    if (!$canMoveSource){
      $success = FALSE;
      $message = "You don't have permission to move the items from the source";
      http_response_code(403); //User if forbidden from operation
    }
  } else {
    //Fail because there is no DB row for the user on this drive so we shouldn't allow an add
    http_response_code(401); //User has bad auth
    $success = false;
    $message = 'Database rejected update';
  }
} else {
  http_response_code(400); //Request is missing a field
}

//Test if user has permission to move to destination
if ($success){
  $sql = "
  SELECT canAddItemsAndFolders
  FROM drive_user
  WHERE userId = '$userId'
  AND driveId = '$destinationDriveId'
  ";
  $result = $conn->query($sql); 
  $canAddDesination = FALSE;
  if ($result->num_rows > 0){
    $row = $result->fetch_assoc();
    $canAddDesination = $row["canAddItemsAndFolders"];
    if (!$canAddDesination){
      $success = FALSE;
      $message = "You don't have permission to move the items into this location";
      http_response_code(403); //User if forbidden from operation
    }
  } else {
    //Fail because there is no DB row for the user on this drive so we shouldn't allow an add
    http_response_code(401); //User has bad auth
    $success = false;
    $message = 'Database rejected update';
  }
}


if ($success){
  $number_items = count($_POST["selectedItemIds"] ?? []);

  $new_values = "";
  for ($i = 0; $i < $number_items; $i++) {
    $itemId =  mysqli_real_escape_string($conn,$_POST["selectedItemIds"][$i]);
    $new_values = $new_values . "('$destinationDriveId','$destinationItemId','$itemId','$newSortOrder'),";
  }
  $new_values = rtrim($new_values,",");

  $sql = "INSERT INTO drive_content (driveId,parentFolderId,itemId,sortOrder)
          VALUES ";
  $sql = $sql . $new_values;
  $sql = $sql . " ON DUPLICATE KEY UPDATE 
  driveId = VALUES(driveId),
  parentFolderId = VALUES(parentFolderId),
  sortOrder = VALUES(sortOrder)
  ";
  $result = $conn->query($sql); 

  /* Update driveId of all child nodes in moved folders */
  $number_items = count($_POST["selectedItemChildrenIds"] ?? []);

  $id_list = "(";

  for ($i = 0; $i < $number_items; $i++) {
    $itemId =  mysqli_real_escape_string($conn,$_POST["selectedItemChildrenIds"][$i]);
    $id_list = $id_list . "'$itemId',";
  }
  $id_list = rtrim($id_list,",");
  
  $sql = "UPDATE drive_content
          SET driveId='$destinationDriveId'
          WHERE itemId IN $id_list)";

  $result = $conn->query($sql); 
}


$response_arr = array( 
    "success" => $success,
    "message"=>$message
   );
 // set response code - 200 OK
 http_response_code(200);

 // make it json format
 echo json_encode($response_arr);



$conn->close();


?>
           
