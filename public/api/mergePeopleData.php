<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: access');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

include 'db_connection.php';
include 'permissionsAndSettingsForOneCourseFunction.php';

$success = true;
$message = '';

$jwtArray = include 'jwtArray.php';
$userId = $jwtArray['userId'];

$_POST = json_decode(file_get_contents('php://input'), true);
$courseId = mysqli_real_escape_string($conn, $_POST['courseId']);
$roleId = mysqli_real_escape_string($conn, $_POST['roleId']);

if ($courseId == '') {
    $success = false;
    $message = 'Request Error: missing courseId';
}
if ($roleId == '') {
    $success = false;
    $message = 'Request Error: missing roleId';
}

//Check permissions
if ($success) {
    $permissions = permissionsAndSettingsForOneCourseFunction(
        $conn,
        $userId,
        $courseId
    );

    if ($permissions['canManageUsers'] != '1') {
        $success = false;
        $message = 'You need permission to manage users.';
    }
}

if ($success) {
    //Set up merge data
    $mergeHeads = array_map(function ($doenetId) use ($conn) {
        return mysqli_real_escape_string($conn, $doenetId);
    }, $_POST['mergeHeads'] ?? []);
    $mergeExternalId = array_map(function ($doenetId) use ($conn) {
        return mysqli_real_escape_string($conn, $doenetId);
    }, $_POST['mergeExternalId'] ?? []);
    $mergeFirstName = array_map(function ($doenetId) use ($conn) {
        return mysqli_real_escape_string($conn, $doenetId);
    }, $_POST['mergeFirstName'] ?? []);
    $mergeLastName = array_map(function ($doenetId) use ($conn) {
        return mysqli_real_escape_string($conn, $doenetId);
    }, $_POST['mergeLastName'] ?? []);
    $mergeEmail = array_map(function ($doenetId) use ($conn) {
        return mysqli_real_escape_string($conn, $doenetId);
    }, $_POST['mergeEmail'] ?? []);
    $mergeSection = array_map(function ($doenetId) use ($conn) {
        return mysqli_real_escape_string($conn, $doenetId);
    }, $_POST['mergeSection'] ?? []);

    // Insert or Update records
    for ($i = 0; $i < count($mergeEmail); $i++) {
        $firstName = '';
        $lastName = '';
        $externalId = '';
        $email = '';
        $section = '';
        $new_userId = include 'randomId.php';

        if (in_array('Email', $mergeHeads, false)) {
            $email = $mergeEmail[$i];
        }
        if (in_array('ExternalId', $mergeHeads, false)) {
            $externalId = $mergeExternalId[$i];
        }
        if (in_array('FirstName', $mergeHeads, false)) {
            $firstName = $mergeFirstName[$i];
        }
        if (in_array('LastName', $mergeHeads, false)) {
            $lastName = $mergeLastName[$i];
        }
        if (in_array('Section', $mergeHeads, false)) {
            $section = $mergeSection[$i];
        }
        //TODO: Verify that this is the correct match strategy
        $email = trim($email);

        //If they don't have an account in user table then make one
        $result = $conn->query(
            "SELECT 
                userId,
                firstName,
                lastName
			FROM user
			WHERE email = '$email'"
        );

        if ($result->num_rows > 0) {
            //Acount found
            $row = $result->fetch_assoc();
            $new_userId = $row['userId'];

            if ($row['firstName'] == '' && in_array('FirstName', $mergeHeads, false)) {
                $result = $conn->query(
                    "UPDATE user
                    SET
                    firstName = '$firstName'
                    WHERE userId = '$new_userId'"
                );
            }
            if ($row['lastName'] == '' && in_array('LastName', $mergeHeads, false)) {
                $result = $conn->query(
                    "UPDATE user
                    SET
                    lastName = '$lastName'
                    WHERE userId = '$new_userId'"
                );
            }
        } elseif ($result->num_rows == 0) {
            //Create user account

            // Random screen name
            $screen_names = include 'screenNames.php';
            $randomNumber = rand(0, count($screen_names) - 1);
            $screenName = $screen_names[$randomNumber];

            // Random profile picture
            $profile_pics = include 'profilePics.php';
            $randomNumber = rand(0, count($profile_pics) - 1);
            $profilePicture = $profile_pics[$randomNumber];

            $result = $conn->query(
                "INSERT INTO user
				SET
				userId = '$new_userId',
				screenName = '$screenName',
				email = '$email',
				lastName = '$lastName',
				firstName = '$firstName',
				profilePicture = '$profilePicture',
				trackingConsent = '1'"
            );
        }

        //gather columns
        $insert = "courseId = '$courseId', userId = '$new_userId', roleId = '$roleId',";
        $update_columns = "courseId = '$courseId', userId = '$new_userId',";
        if ($externalId != '') {
            $insert = $insert . "externalId = '$externalId',";
            $update_columns = $update_columns . "externalId = '$externalId',";
        }
        if ($section != '') {
            $insert = $insert . "section = '$section',";
            $update_columns = $update_columns . "section = '$section',";
        }
        $insert = rtrim($insert, ', '); //REMOVE trailing comma
        $update_columns = rtrim($update_columns, ', '); //REMOVE trailing comma

        //insert or update
        $result = $conn->query(
            "INSERT INTO course_user
			SET
				$insert
			ON DUPLICATE KEY UPDATE
				$update_columns"
        );
    }

    // Get all records for JS
    $result = $conn->query(
        "SELECT 
			u.email,
			u.firstName, 
			u.lastName,
            u.screenName,
            cu.roleId,
			cu.section, 
			cu.dateEnrolled, 
			cu.externalId, 
			cu.withdrew
		FROM 
			course_user as cu, 
			user as u
		WHERE 
			cu.userId = u.userId AND 
			cu.courseId = '$courseId'
		ORDER BY 
			firstName"
    );

    $peopleArray = [];
    if ($result->num_rows >= 1) {
        while ($row = $result->fetch_assoc()) {
            $person = [
                'roleId' => $row['roleId'],
                'firstName' => $row['firstName'],
                'lastName' => $row['lastName'],
                'email' => $row['email'],
                'screenName' => $row['screenName'],
                'dateEnrolled' => $row['dateEnrolled'],
                'externalId' => $row['externalId'],
                'section' => $row['section'],
                'withdrew' => $row['withdrew'],
            ];
            array_push($peopleArray, $person);
        }
    }
}

$response_arr = [
    'success' => $success,
    'message' => $message,
    'peopleArray' => $peopleArray,
];

http_response_code(200);

// make it json format
echo json_encode($response_arr);

$conn->close();
?>
