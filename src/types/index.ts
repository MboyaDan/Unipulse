export type CourseCategory =
  | 'Data Science'
  | 'Data Analytics'
  | 'Business Analytics'
  | 'Computer Science'
  | 'Software Engineering'
  | 'Cybersecurity'
  | 'AI'
  | 'Machine Learning'
  | 'Information Technology'
  | 'Finance'
  | 'Business'
  | 'Other'

export const COURSE_CATEGORIES: CourseCategory[] = [
  'Data Science',
  'Data Analytics',
  'Business Analytics',
  'Computer Science',
  'Software Engineering',
  'Cybersecurity',
  'AI',
  'Machine Learning',
  'Information Technology',
  'Finance',
  'Business',
  'Other',
]

export type CommunityStatus =
  | 'Not Started'
  | 'Building Interest'
  | 'Threshold Reached'
  | 'Community Created'
  | 'Active'
  | 'Paused'
  | 'Archived'

export type AcquisitionChannel = 'WhatsApp' | 'Instagram' | 'TikTok' | 'Organic' | 'Referral' | 'Other'
export type VerificationStatus = 'New' | 'Under Review' | 'Verified' | 'Rejected'
export type ContactStatus = 'New' | 'Contacted' | 'Added to Community'
export type DataConfidence = 'verified' | 'estimated' | 'unavailable'
export type UniversityType = 'Russell Group' | 'Research' | 'Teaching-Intensive' | 'Technical' | 'Other'

export interface Country {
  id: string
  name: string
  code: string
  flag_emoji: string
  active: boolean
}

export interface UniversityProgress {
  id: string
  name: string
  slug: string
  city: string | null
  country_code: string
  country_name: string
  flag_emoji: string
  current_registrations: number
  community_threshold: number
  community_status: CommunityStatus
}

export interface UniversityFull {
  id: string
  name: string
  slug: string
  country_id: string
  city: string | null
  region: string | null
  website: string | null
  university_type: UniversityType | null
  est_total_students: number | null
  est_international_students: number | null
  international_pct: number | null
  postgrad_population: number | null
  programme_categories: CourseCategory[]
  international_recruitment_strength: number | null
  opportunity_score_computed: number
  opportunity_score_override: number | null
  opportunity_score?: number
  priority_tier: number
  active: boolean
  community_status: CommunityStatus
  community_threshold: number
  current_registrations: number
  whatsapp_link: string | null
  community_name: string | null
  community_admin_notes: string | null
  data_confidence: DataConfidence
  date_added: string
  updated_at: string
}

export interface Student {
  id: string
  full_name: string
  phone_whatsapp: string
  country_id: string
  university_id: string
  course_category: CourseCategory
  course_exact_text: string | null
  acquisition_channel: AcquisitionChannel
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referred_by_student_id: string | null
  consent_given: boolean
  verification_status: VerificationStatus
  contact_status: ContactStatus
  internal_notes: string | null
  is_duplicate_flag: boolean
  is_ambassador: boolean
  date_registered: string
}

export interface RegistrationReceipt {
  full_name: string
  university_name: string
  university_slug: string
  country_code: string
  course_category: CourseCategory
  position_at_university: number
  current_registrations: number
  community_threshold: number
  referral_code: string
}

export interface LivePulse {
  registrations_last_hour: number
  total_registrations: number
  universities_active: number
}
