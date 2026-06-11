<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: access');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

include 'db_connection.php';
include "permissionsAndSettingsForOneCourseFunction.php";
include "cidFromSHA.php";

$jwtArray = include 'jwtArray.php';
$userId = $jwtArray['userId'];

$success = true;
$message = "";

//required unless data is passed in application/x-www-form-urlencoded or multipart/form-data
$_POST = json_decode(file_get_contents('php://input'), true);

if (!array_key_exists('courseId', $_POST)) {
    $success = false;
    $message = 'Missing courseId';
} elseif (!array_key_exists('pagesDoenetIds', $_POST)) {
    $success = false;
    $message = 'Missing pagesDoenetIds';
} elseif (!array_key_exists('courseContentDoenetIds', $_POST)) {
    $success = false;
    $message = 'Missing courseContentDoenetIds';
} elseif (!array_key_exists('activitiesJson', $_POST)) {
    $success = false;
    $message = 'Missing activitiesJson';
} elseif (!array_key_exists('activitiesJsonDoenetIds', $_POST)) {
    $success = false;
    $message = 'Missing activitiesJsonDoenetIds';
} elseif (!array_key_exists('collectionsJson', $_POST)) {
    $success = false;
    $message = 'Missing collectionsJson';
} elseif (!array_key_exists('collectionsJsonDoenetIds', $_POST)) {
    $success = false;
    $message = 'Missing collectionsJsonDoenetIds';
} elseif (!array_key_exists('pageLinkDoenetIds', $_POST)) {
    $success = false;
    $message = 'Missing pageLinkDoenetIds';
} elseif (!array_key_exists('baseCollectionsDoenetIds', $_POST)) {
    $success = false;
    $message = 'Missing baseCollectionsDoenetIds';
}

//Test Permission to edit content
if ($success){
    $courseId = mysqli_real_escape_string($conn, $_POST['courseId']);
    $pagesDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["pagesDoenetIds"] ?? []);
    $courseContentDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["courseContentDoenetIds"] ?? []);
    $activitiesJson = $_POST["activitiesJson"];
    $activitiesJsonDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["activitiesJsonDoenetIds"] ?? []);
    $collectionsJson = $_POST["collectionsJson"];
    $collectionsJsonDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["collectionsJsonDoenetIds"] ?? []);
    $pageLinkDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["pageLinkDoenetIds"] ?? []);
    $baseCollectionsDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["baseCollectionsDoenetIds"] ?? []);
    $baseActivitiesDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["baseActivitiesDoenetIds"] ?? []);
    $baseSectionsDoenetIds = array_map(function ($item) use ($conn) {
        return mysqli_real_escape_string($conn, $item);
    }, $_POST["baseSectionsDoenetIds"] ?? []);


    $permissions = permissionsAndSettingsForOneCourseFunction($conn,$userId,$courseId);
    if ($permissions["canEditContent"] != '1'){
      $success = FALSE;
      $message = "You need edit permission to add a page or order.";
    }
}

if ($success) {
    if (count($pageLinkDoenetIds) > 0){
        $list_of_pageLinkDoenetIds = join("','",$pageLinkDoenetIds);
        $list_of_pageLinkDoenetIds = "'" . $list_of_pageLinkDoenetIds . "'";  
        $sql = "
        DELETE FROM link_pages
        WHERE doenetId IN ($list_of_pageLinkDoenetIds)
        AND courseId='$courseId'
        ";
        $conn->query($sql); 
        //Delete collection link files
        foreach($pageLinkDoenetIds AS &$pageLinkDoenetId){
            $fileLocation = "../media/byPageId/$pageLinkDoenetId.doenet";
            unlink($fileLocation);
        }
    }
    if (count($baseCollectionsDoenetIds) > 0){
        $list_of_baseCollectionsDoenetIds = join("','",$baseCollectionsDoenetIds);
        $list_of_baseCollectionsDoenetIds = "'" . $list_of_baseCollectionsDoenetIds . "'";
        $sql = "
        UPDATE course_content
        SET isDeleted = '1'
        WHERE doenetId IN ($list_of_baseCollectionsDoenetIds)
        AND courseId='$courseId'
        ";
        $conn->query($sql);
    }
    if (count($baseActivitiesDoenetIds) > 0){
        $list_of_baseActivitiesDoenetIds = join("','",$baseActivitiesDoenetIds);
        $list_of_baseActivitiesDoenetIds = "'" . $list_of_baseActivitiesDoenetIds . "'";
        $sql = "
        UPDATE course_content
        SET isDeleted = '1'
        WHERE doenetId IN ($list_of_baseActivitiesDoenetIds)
        AND courseId='$courseId'
        ";
        $conn->query($sql);
    }
    if (count($baseSectionsDoenetIds) > 0){
        $list_of_baseSectionsDoenetIds = join("','",$baseSectionsDoenetIds);
        $list_of_baseSectionsDoenetIds = "'" . $list_of_baseSectionsDoenetIds . "'";
        $sql = "
        UPDATE course_content
        SET isDeleted = '1'
        WHERE doenetId IN ($list_of_baseSectionsDoenetIds)
        AND courseId='$courseId'
        ";
        $conn->query($sql);
    }
    
    //Mark pages deleted
    if (count($pagesDoenetIds) > 0){
        $list_of_pagesDoenetIds = join("','",$pagesDoenetIds);
        $list_of_pagesDoenetIds = "'" . $list_of_pagesDoenetIds . "'";
        $sql = "
        UPDATE pages
        SET isDeleted = '1'
        WHERE doenetId IN ($list_of_pagesDoenetIds)
        AND courseId='$courseId'
        ";
        $conn->query($sql);
    }

    if (count($collectionsJsonDoenetIds) > 0){
        for($i = 0; $i < count($collectionsJsonDoenetIds); $i++){
            $collectionsJsonDoenetId = $collectionsJsonDoenetIds[$i];
            $collectionJson = $collectionsJson[$i];
            $json = json_encode($collectionJson);
            $sql = "
            UPDATE course_content
            SET jsonDefinition=JSON_REPLACE(jsonDefinition,'$.pages',JSON_MERGE('[]','$json'))
            WHERE doenetId='$collectionsJsonDoenetId'
            AND courseId='$courseId'
            ";
            $conn->query($sql);
        }
    }

    if (count($activitiesJsonDoenetIds) > 0){
        for($i = 0; $i < count($activitiesJsonDoenetIds); $i++){
            $activitiesJsonDoenetId = $activitiesJsonDoenetIds[$i];
            $activitiesJson = $activitiesJson[$i];
            $json = json_encode($activitiesJson);
            $sql = "
            UPDATE course_content
            SET jsonDefinition=JSON_REPLACE(jsonDefinition,'$.content',JSON_MERGE('[]','$json'))
            WHERE doenetId='$activitiesJsonDoenetId'
            AND courseId='$courseId'
            ";
            $conn->query($sql);
        }
    }


}


$response_arr = array(
    "success"=>$success,
    "message"=>$message
    );
  
  
  // set response code - 200 OK
  http_response_code(200);
  
  // make it json format
  echo json_encode($response_arr);
  $conn->close();

?>
