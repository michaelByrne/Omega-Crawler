<?php

error_reporting(E_ALL);
ini_set('display_errors', 'ON');
$Start = $_GET["start"];


if(empty($Start))
{
    $dictionary = array('Result' => 5, 'Result_text' => "Invalid Staring URL");
    echo json_encode($dictionary);
    exit;
}


$Method = $_GET["method"];
if($Method != "BF" && $Method != "DF")
{
    $dictionary = array('Result' => 6, 'Result_text' => "Invalid Method Type, only DF or BF allowed.");
    echo json_encode($dictionary);
    exit;
}


$Max = $_GET["max"];
if(!is_numeric($Max) || $Max < 0)
{
     $dictionary = array('Result' => 7, 'Result_text' => "Invalid Max # of Pages, between 1 and 25 allowed.");
     echo json_encode($dictionary);
     exit;
}

$Limit = $_GET["limit"];
if(!is_numeric($Limit) || $Max < 0)
{
     $dictionary = array('Result' => 7, 'Result_text' => "Must specify a child limit");
     echo json_encode($dictionary);
     exit;
}


if(array_key_exists('term',$_GET))
{
    $Term = $_GET["term"];
}

/*check if backend file exit */
if (!file_exists("omega_webcrawl.py"))
{
    $dictionary = array('Result' => 8, 'Result_text' => "Web Crawler Server unavailable.");
     echo json_encode($dictionary);
     exit;
}

if(array_key_exists('term',$_GET))
{
    $command = escapeshellcmd("/usr/bin/python omega_webcrawl.py ".$Start." ".$Method." ".$Max." ".$Limit." \"".urldecode($Term)."\"");
}
else
{
    $command = escapeshellcmd("/usr/bin/python omega_webcrawl.py ".$Start." ".$Method." ".$Max." ".$Limit);
}
$output = shell_exec($command );
if(!isJson($output))
{
    $dictionary = array('Result' => 9, 'Result_text' => "Web Crawler Error. (Invalid response from server)");
    echo json_encode($dictionary);
    exit;
}
echo $output;

function isJson($string)
{
    json_decode($string);
    return (json_last_error() == JSON_ERROR_NONE);
}
?>
