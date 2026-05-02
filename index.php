<?php
// Since your Next.js design is running on PM2 (Port 3000)
// This jumps the user from the IP address to the Scanner
header("Location: http://localhost:3000");
exit;
?>