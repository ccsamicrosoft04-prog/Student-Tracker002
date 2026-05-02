// app/actions.ts
"use server";
import { neon } from "@neondatabase/serverless";

export async function getData() {
    const sql = neon(process.env.DATABASE_URL);
    const data = await sql`...`;
    return data;
}

  // Save to database
  await sql('INSERT INTO records (student_id, time) VALUES ($1, $2)', [studentId, time]); 
