<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: access");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

include "db_connection.php";
include "lexicographicalRankingSort.php";
include "permissionsAndSettingsForOneCourseFunction.php";

$jwtArray = include "jwtArray.php";
$userId = $jwtArray['userId'];

$success = TRUE;
$message = "";

$_POST = json_decode(file_get_contents('php://input'), true);

if (!array_key_exists('courseId', $_POST)) {
    $success = false;
    $message = 'Missing courseId';
} elseif (!array_key_exists('previousContainingDoenetId', $_POST)) {
    $success = false;
    $message = 'Missing previousContainingDoenetId';
} elseif (!array_key_exists('itemType', $_POST)) {
    $success = false;
    $message = 'Missing itemType';
} elseif (!array_key_exists('parentDoenetId', $_POST)) {
    $success = false;
    $message = 'Missing parentDoenetId';
} 

if ($userId == ''){
  $success = FALSE;
  $message = "You need to be signed in to make changes to a course";
}

//Test Permission to edit content
if ($success){
  $courseId = mysqli_real_escape_string($conn, $_POST['courseId']);
  $itemType = mysqli_real_escape_string($conn,$_POST["itemType"]);
  $previousContainingDoenetId = $_POST["previousContainingDoenetId"];
  $parentDoenetId = $_POST["parentDoenetId"];

  //Optional cloneMode is '1' for true or '' for false
  $cloneMode = mysqli_real_escape_string($conn,$_POST["cloneMode"]);
  $pageDoenetIds = array_map(function ($item) use ($conn) {
      return mysqli_real_escape_string($conn, $item);
  }, $_POST["pageDoenetIds"] ?? []);
  $pageLabels = array_map(function ($item) use ($conn) {
    return mysqli_real_escape_string($conn, $item);
}, $_POST["pageLabels"] ?? []);
  $orderDoenetIds = array_map(function ($item) use ($conn) {
    return mysqli_real_escape_string($conn, $item);
}, $_POST["orderDoenetIds"] ?? []);
  $activityLabel = mysqli_real_escape_string($conn,$_POST["activityLabel"]);
  $DangerousActivityObj = json_encode($_POST['activityObj']);



  $permissions = permissionsAndSettingsForOneCourseFunction($conn,$userId,$courseId);
  if ($permissions["canEditContent"] != '1'){
    $success = FALSE;
    $message = "You need permission to edit content.";
  }
}


if ($success){
  $doenetId = include "randomId.php";
  $doenetId = "_" . $doenetId;
  $label = 'Untitled';
  $jsonDefinition = null;
  $isAssigned = 0;

  $sql = "SELECT sortOrder
  FROM `course_content`
  WHERE courseId = '$courseId' 
  AND sortOrder >= (Select sortOrder From `course_content` WHERE doenetId='$previousContainingDoenetId' AND isDeleted = 0)
  AND isDeleted = 0
  ORDER BY sortOrder
  LIMIT 2";
  $result = $conn->query($sql); 
  $row = $result->fetch_assoc() ;
  $prev = $row['sortOrder'] ?: "";
  $row = $result->fetch_assoc();
  $next = $row['sortOrder'] ?: "";
  $sortOrder = SortOrder\getSortOrder($prev, $next);

  //Defaults for each item type
  if ($itemType == 'section'){
    $jsonDefinition = '{"isIncludedInStudentNavigation":true}';
    $isAssigned = 1;
    $label = 'Untitled Section';
  }else if($itemType == 'activity'){
    $pageDoenetId = include "randomId.php";
    $pageDoenetId = "_" . $pageDoenetId;
    $label = 'Untitled Activity';

    $jsonDefinition = '{"type":"activity","version": "0.1.0","isSinglePage": true,"content":["'.$pageDoenetId.'"],"assignedCid":null,"draftCid":null,"itemWeights": [1],"files":[]}';

    //We need to clone an existing item
  if ($cloneMode == '1'){
    //  echo "\n\nDangerousActivityOrder\n\n";
    //  var_dump($DangerousActivityObj);
    $label = "copy of $activityLabel";
    $clonePageDoenetIds = [];
    foreach ($pageDoenetIds as $pageDoenetId){
      $clonePageDoenetId = include "randomId.php";
      $clonePageDoenetId = "_" . $clonePageDoenetId;

      array_push($clonePageDoenetIds,$clonePageDoenetId);
      $DangerousActivityObj = str_replace($pageDoenetId,$clonePageDoenetId,$DangerousActivityObj);
    }
    foreach ($orderDoenetIds as $sourceOrderDoenetId){
      $cloneOrderDoenetId = include "randomId.php";
      $cloneOrderDoenetId = "_" . $cloneOrderDoenetId;

      $DangerousActivityObj = str_replace($sourceOrderDoenetId,$cloneOrderDoenetId,$DangerousActivityObj);
    }

    $jsonDefinition = $DangerousActivityObj;
    
    }
    
  }else if($itemType == 'bank'){
    $jsonDefinition = '{"type":"bank","pages":[]}';
    $label = 'Untitled Collection';

  }else{
    $success = FALSE;
    $message = "Not able to make type $itemType";
  }
}

if ($success){

  //Transaction with two inserts
  if ($itemType == 'activity'){
 
    // $conn->begin_transaction();

    try {
      $sql = "
        INSERT INTO course_content 
        (type,
        courseId,
        doenetId,
        parentDoenetId,
        label,
        creationDate,
        sortOrder,
        jsonDefinition,
        imagePath)
        VALUES
        ('$itemType','$courseId','$doenetId','$parentDoenetId','$label',CONVERT_TZ(NOW(), @@session.time_zone, '+00:00'),'$sortOrder','$jsonDefinition','/activity_default.jpg');
        ";
        $conn->query($sql);

        //ONLY in CLONE MODE
        if ($cloneMode == '1'){

          $pagesEntered = [];
          for ($i = 0; $i < count($clonePageDoenetIds);$i++){
            $clonePageDoenetId = $clonePageDoenetIds[$i];
            $sourcePageDoenetId = $pageDoenetIds[$i];
            $sourcePageLabel = $pageLabels[$i];
            // echo "\nclone $clonePageDoenetId sourceLabel $sourcePageLabel sourcedoenetId $sourcePageDoenetId\n";

            $sql = "
            INSERT INTO pages (courseId,containingDoenetId,doenetId,label) 
              VALUES('$courseId','$doenetId','$clonePageDoenetId','$sourcePageLabel');
            ";
            $conn->query($sql);

            array_push($pagesEntered,array(
              "type"=>"page",
              "label"=>$sourcePageLabel,
              "containingDoenetId"=>$doenetId,
              "doenetId"=>$clonePageDoenetId,
            ));

            //Create a copy of original file for page
            $sourceFilePath = "../media/byPageId/$sourcePageDoenetId.doenet";
            $destFilePath = "../media/byPageId/$clonePageDoenetId.doenet";
            if (!copy($sourceFilePath, $destFilePath)) {
              $success = false;
              $message = "failed to copy media\n";
            }
        
          }
       
          
    
          

        }else{
          $sql = "
          INSERT INTO pages (courseId,containingDoenetId,doenetId) 
            VALUES('$courseId','$doenetId','$pageDoenetId');
          ";
          $conn->query($sql);
          $pageEntered = array(
            "type"=>"page",
            "label"=>"Untitled Page",
            "containingDoenetId"=>$doenetId,
            "doenetId"=>$pageDoenetId,
            "cid"=>"bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"
          );
          
    
          //Create blank file for page
          $filename = "../media/byPageId/$pageDoenetId.doenet";
          $dirname = dirname($filename);
          if (!is_dir($dirname)) {
              mkdir($dirname, 0755, true);
          }
  
          $newfile = fopen($filename, "w");
          if ($newfile === false) {
              $success = false;
              $message = "Unable to open file!";
          } else {
              // don't write anything to file so that it is a blank file
              fclose($newfile);
          }
        }
        

        /* If code reaches this point without errors then commit the data in the database */
        // $conn->commit();
    } catch (mysqli_sql_exception $exception) {
        // $conn->rollback();

        $success = FALSE;
        $message = $exception;
    }
    

  }else{
    $sql = "
    INSERT INTO course_content 
    (type,
    courseId,
    doenetId,
    parentDoenetId,
    label,
    creationDate,
    isAssigned,
    sortOrder,
    jsonDefinition,
    imagePath)
    VALUES
    ('$itemType','$courseId','$doenetId','$parentDoenetId','$label',CONVERT_TZ(NOW(), @@session.time_zone, '+00:00'),'$isAssigned','$sortOrder','$jsonDefinition','/activity_default.jpg')
    ";
    
    $result = $conn->query($sql); 

  }

}

if ($success){

  $sql = "
  SELECT 
  doenetId,
  type,
  parentDoenetId,
  label,
  creationDate,
  isAssigned,
  isGloballyAssigned,
  isPublic,
  CAST(jsonDefinition as CHAR) AS json
  FROM course_content
  WHERE doenetId = '$doenetId'
  ";
  $result = $conn->query($sql); 
  $row = $result->fetch_assoc();


  $itemEntered = array(
    "doenetId"=>$row['doenetId'],
    "type"=>$row['type'],
    "parentDoenetId"=>$row['parentDoenetId'],
    "label"=>$row['label'],
    "creationDate"=>$row['creationDate'],
    "isAssigned"=>$row['isAssigned'] == '1' ? true : false,
    "isGloballyAssigned"=>$row['isGloballyAssigned'] == '1' ? true : false,
    "isPublic"=>$row['isPublic'] == '1' ? true : false,
  );

  $json = json_decode($row['json'],true);
  // var_dump($json);
  $itemEntered = array_merge($json,$itemEntered);


  $itemEntered['isOpen'] = false;
  $itemEntered['isSelected'] = false;

}

$response_arr = array(
  "success"=>$success,
  "message"=>$message,
  "doenetId"=>$doenetId,
  "itemEntered"=>$itemEntered,
  "pageEntered"=>$pageEntered,
  "pagesEntered"=>$pagesEntered,
  "pageDoenetId"=>$pageDoenetId,
  );


// set response code - 200 OK
http_response_code(200);

// make it json format
echo json_encode($response_arr);
$conn->close();

?>