<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: access');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

include 'db_connection.php';
include 'permissionsAndSettingsForOneCourseFunction.php';

date_default_timezone_set('UTC');
// America/Chicago

$jwtArray = include 'jwtArray.php';
$requestorUserId = $jwtArray['userId'];

$_POST = json_decode(file_get_contents('php://input'), true);
$attemptNumber = mysqli_real_escape_string($conn, $_POST['attemptNumber']);
$doenetId = mysqli_real_escape_string($conn, $_POST['doenetId']);

$emails = array_map(function ($item) use ($conn) {
    return mysqli_real_escape_string($conn, $item);
}, $_POST['emails'] ?? []);
$scores = array_map(function ($item) use ($conn) {
    return mysqli_real_escape_string($conn, $item);
}, $_POST['scores'] ?? []);

$success = true;
$message = '';

if ($attemptNumber == '') {
    $success = false;
    $message = 'Internal Error: missing attemptNumber';
} elseif ($doenetId == '') {
    $success = false;
    $message = 'Internal Error: missing doenetId';
}

//Lookup data
if ($success) {
    //Look up total points for assignment
    $result = $conn->query(
        "SELECT 
      attemptAggregation,
      totalPointsOrPercent,
      courseId
    FROM assignment
    WHERE doenetId = '$doenetId'"
    );
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $totalPointsOrPercent = $row['totalPointsOrPercent'];
        $attemptAggregation = $row['attemptAggregation'];
        $courseId = $row['courseId'];

        if (!($totalPointsOrPercent > 0)) {
            $success = false;
            $message =
                'Assignment is worth 0 points, so scores cannot be converted to credit.';
        }
    } else {
        $success = false;
        $message = "No assignment with doenetId: $doenetId";
    }
}

//Check permissions
if ($success) {
    $requestorPermissions = permissionsAndSettingsForOneCourseFunction(
        $conn,
        $requestorUserId,
        $courseId
    );

    if ($requestorPermissions == false) {
        $success = false;
        $message = 'You are not authorized to view or modify grade data';
    } elseif ($requestorPermissions['canViewAndModifyGrades'] != '1') {
        $success = false;
        $message = 'You are only allowed to view your own data';
    }
}


$failedEmails = [];

if ($success) {
    foreach ($emails as $key => $email) {
        // A blank score means the student is not being graded; a non-numeric
        // one is reported.  Either way, don't divide by it: that is fatal in
        // PHP 8.
        $score = $scores[$key] ?? '';
        if (is_string($score)) {
            $score = trim($score);
        }
        if ($score === '' || $score === null) {
            continue;
        }
        if (!is_numeric($score)) {
            array_push($failedEmails, $email);
            continue;
        }

        $credit = $score / $totalPointsOrPercent;

        //Find userId
        $result = $conn->query(
            "SELECT u.userId
            FROM user AS u
            INNER JOIN course_user AS cu
            ON cu.userId = u.userId
            WHERE u.email = '$email'
            AND cu.courseId = '$courseId' 
            "
        );
        //Uploaded data requires students who are enrolled
        if ($result->num_rows < 1) {
            array_push($failedEmails, $email);
            continue;
        }
        $row = $result->fetch_assoc();
        $emailUserId = $row['userId'];

        //If a row exists then update else insert
        $result = $conn->query(
            "SELECT doenetId
            FROM user_assignment_attempt
            WHERE userId = '$emailUserId'
            AND doenetId = '$doenetId'
            AND attemptNumber = '$attemptNumber'
            "
        );

        if ($result->num_rows > 0) {
            $sql = "UPDATE user_assignment_attempt
                SET credit='$credit',
                creditOverride='$credit'
                WHERE userId = '$emailUserId'
                AND doenetId = '$doenetId'
                AND attemptNumber = '$attemptNumber'
                ";
        } else {
            $sql = "INSERT INTO user_assignment_attempt (doenetId,userId,attemptNumber,credit,creditOverride)
              VALUES
              ('$doenetId','$emailUserId','$attemptNumber','$credit','$credit')
              ";
        }
        $result = $conn->query($sql);

        // if we don't have a record for this user on the user_assignment table then we need to insert not update
        $result = $conn->query(
            "SELECT creditOverride
            FROM user_assignment
            WHERE doenetId = '$doenetId'
            AND userId = '$emailUserId'"
        );

        $need_insert = true;
        if ($result->num_rows > 0) {
            $need_insert = false;
            $row = $result->fetch_assoc();
            $creditOverride_for_assignment = $row['creditOverride'];

            // if we have $creditOverride_for_assignment, don't update assignment credit
            if ($creditOverride_for_assignment != null) {
                continue;
            }
        }

        $result = $conn->query(
            "SELECT 
            credit
            FROM user_assignment_attempt
            WHERE userId = '$emailUserId'
            AND doenetId = '$doenetId'
            ORDER BY attemptNumber DESC"
        );

        $credit_for_assignment = 0;

        //Update user_assignment table
        if ($attemptAggregation == 'm') {
            // Find maximum attempt score
            while ($row = $result->fetch_assoc()) {
                $attemptCredit = $row['credit'];
                // $attemptCredit = (float) $row['credit'];

                if ($attemptCredit > $credit_for_assignment) {
                    $credit_for_assignment = $attemptCredit;
                }
            }
        } elseif ($attemptAggregation == 'l') {
            // Use latest attempt score
            $row = $result->fetch_assoc();
            $lastCredit = $row['credit'];

            $credit_for_assignment = $lastCredit;
        }

        if ($need_insert) {
            // insert credit in user_assigment
            $sql = "INSERT INTO user_assignment (doenetId,userId,credit)
              VALUES
              ('$doenetId','$emailUserId','$credit_for_assignment')
              ";
        } else {
            // update credit in user_assigment
            $sql = "UPDATE user_assignment
              SET credit='$credit_for_assignment'
              WHERE userId = '$emailUserId'
              AND doenetId = '$doenetId'
              ";
        }
        $result = $conn->query($sql);
    }
}

$response_arr = [
    'success' => $success,
    'message' => $message,
    'failedEmails' => $failedEmails,
];

// set response code - 200 OK
http_response_code(200);

echo json_encode($response_arr);

$conn->close();
?>
