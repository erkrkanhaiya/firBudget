import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';

export async function GET() {
  const version = packageJson.version;
  const date = new Date().toISOString();

  return NextResponse.json({ version, date });
}