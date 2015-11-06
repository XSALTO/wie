<?php
$upload_dir = "upload/";
$img = $_POST['imageData'];
//$img = str_replace(' ','+', $img);
$data = base64_decode($img);
print $data;
print $img;
$file = $upload_dir . mktime() . ".jpeg";
$success = file_put_contents($file, $data);
print $success ? $file : 'Unable to save the file.';
?>
