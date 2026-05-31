<?php
//TODO: Kevin, Emilio – discus True / False vs '1' / '0' returns
//Note using object oriented variables to avoild variable collisions

require_once "db_connection.php";
require_once "permissionsAndSettingsFunction.php";
error_reporting(E_ERROR | E_PARSE);

//Initialize $settings before assigning properties below.
//Required on PHP 8+, where writing a property on an undefined variable
//is a fatal Error ("Attempt to assign property on null"); on PHP 7.4 it
//was only a warning. doenet.org runs PHP 8, so without this the
//getCoursePermissionsAndSettings endpoint 500s and /courses breaks.
$settings = new stdClass();

$settings->key = $ini_array['key'];
use \Firebase\JWT\JWT;
require_once "vendor/autoload.php";


$settings->jwt =  mysqli_real_escape_string($conn,$_COOKIE["JWT"]);
$settings->jwt_array = array();

if ($settings->jwt != ""){
    $settings->jwt_array = (array) JWT::decode($settings->jwt, $settings->key, array('HS256'));
    $userId = array_key_exists("userId",$settings->jwt_array) ? $settings->jwt_array['userId'] : "";
}

$settings->ejwt_array = array();
if (array_key_exists("EJWT",$_COOKIE)){
  //Keep euserId and userId separate keys so we know the source
  $settings->ejwt =  mysqli_real_escape_string($conn,$_COOKIE["EJWT"]);

  if ($settings->ejwt != ""){
    $settings->ejwt_array = (array) JWT::decode($settings->ejwt, $settings->key, array('HS256'));
    $examUserId = array_key_exists("examineeUserId",$settings->ejwt_array) ? $settings->ejwt_array['examineeUserId'] : "";
    $examDoenetId = array_key_exists("doenetId",$settings->ejwt_array) ? $settings->ejwt_array['doenetId'] : "";
    $examPasscode = array_key_exists("examPasscode",$settings->ejwt_array) ? $settings->ejwt_array['examPasscode'] : "";
  }
}


// echo "userId -$userId-\n";
// echo "examUserId -$examUserId-\n";
// echo "examDoenetId -$examDoenetId-\n";
// echo "examPasscode -$examPasscode-\n";


//Test course's passcode if it matches the courseId for that doenetId 
//then allow userId to be defined as exam userId
//If examUserId is defined at all and doesn't match then return empty info
//If it does match then return student permissions.

$permissionsAndSettings = [];
$permissionsAndSettingsByCourseId = [];

if (array_key_exists("examineeUserId",$settings->ejwt_array)){

    //TODO: code should be by proctor
    //TEST the examcode
    $settings->sql = "
    SELECT c.courseId
    FROM course_content AS cc
    INNER JOIN course AS c
    ON c.courseId = cc.courseId
    WHERE cc.doenetId = '$examDoenetId'
    AND c.examPasscode = '$examPasscode'
    ";

    $settings->result = $conn->query($settings->sql);
    if ($settings->result->num_rows > 0) {

    $settings->sql = "SELECT
    c.courseId,
    c.label,
    c.isPublic,
    c.image,
    c.color,
    c.defaultRoleId,
    c.canAutoEnroll
    FROM course_content AS cc
    LEFT JOIN course AS c
    ON c.courseId = cc.courseId
    WHERE cc.doenetId = '$examDoenetId'
    AND c.isDeleted = '0'
    ";

    $settings->result = $conn->query($settings->sql);
    if ($settings->result->num_rows > 0) {
        $settings->row = $settings->result->fetch_assoc();

        $settings->oneCourse = [
            'courseId' => $settings->row['courseId'],
            'label' => $settings->row['label'],
            'isPublic' => $settings->row['isPublic'],
            'image' => $settings->row['image'],
            'color' => $settings->row['color'],
            'defaultRoleId' => $settings->row['defaultRoleId'],
            'canAutoEnroll' => $settings->row['canAutoEnroll'],
            'roleId' => $settings->row['roleId'],
            'roleLabel' => $settings->row['roleLabel'],
            'isIncludedInGradebook' => '1',
            'canViewContentSource' => '0',
            'canEditContent' => '0',
            'canPublishContent' => '0',
            'canViewUnassignedContent' => '0',
            'canProctor' => '0',
            'canViewAndModifyGrades' => '0',
            'canViewActivitySettings' => '0',
            'canModifyActivitySettings' => '0',
            'canModifyCourseSettings' => '0',
            'canViewUsers' => '0',
            'canManageUsers' => '0',
            'isAdmin' => '0',
            'dataAccessPermission' => '0',
            'isOwner' => '0',
        ];
        array_push($permissionsAndSettings, $settings->oneCourse);
        $permissionsAndSettingsByCourseId[$settings->row['courseId']] = $settings->oneCourse;
    }
    }

} else {
    $permissionsAndSettings = getpermissionsAndSettings($conn, $userId);

    foreach ($permissionsAndSettings as $courseInfo) {
        $permissionsAndSettingsByCourseId[$courseInfo['courseId']] = $courseInfo;
    }
}


?>
