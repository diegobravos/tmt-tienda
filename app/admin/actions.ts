'use server'

export async function validateAdminPassword(password: string): Promise<boolean> {
  return password === process.env.ADMIN_PASSWORD
}
