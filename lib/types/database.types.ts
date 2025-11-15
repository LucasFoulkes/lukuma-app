/**
 * Database types
 * 
 * You can generate these automatically from your Supabase schema:
 * npx supabase gen types typescript --project-id your-project-id > lib/types/database.types.ts
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            // Define your tables here
            // users: {
            //   Row: {
            //     id: string
            //     email: string
            //     created_at: string
            //   }
            //   Insert: {
            //     id?: string
            //     email: string
            //     created_at?: string
            //   }
            //   Update: {
            //     id?: string
            //     email?: string
            //     created_at?: string
            //   }
            // }
        }
        Views: {
            // Define your views here
        }
        Functions: {
            // Define your functions here
        }
        Enums: {
            // Define your enums here
        }
    }
}
