$jsonPath = "track_data.json"
$csvPath = "Missing_DOB_Athletes.csv"

Write-Host "Reading $jsonPath..."
$json = Get-Content -Path $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$athletes = $json.athletes

Write-Host "Total athletes: $($athletes.Count)"

$filtered = $athletes | Where-Object {
    $dob = [string]$_.dob
    return [string]::IsNullOrWhiteSpace($dob) -or 
    $dob.StartsWith("01/01") -or 
    $dob.EndsWith("-01-01")
}

Write-Host "Found $($filtered.Count) athletes matching criteria."

$filtered | Select-Object firstName, lastName, gender, dob, club, id | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

Write-Host "Exported to $csvPath"
