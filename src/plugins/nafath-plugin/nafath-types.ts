export interface NafathInitRequest {
  Action: "SpRequest";
  Parameters: {
    service: "AdvancedLogin";
    id: string;
  };
}

export interface NafathInitResponse {
  transId: string;
  random: string;
}

export interface NafathCheckRequest {
  Action: "CheckSpRequest";
  Parameters: {
    id: string;
    random: string;
    transId: string;
  };
}

export interface NafathCheckResponse {
  status: "WAITING" | "COMPLETED" | "EXPIRED" | "FAILED" | "REJECTED";
  accessToken?: string;
}

export interface NafathStatusRequest {
  Action: "SpStatus";
  Parameters: {
    transactionId: string;
  };
}

export interface NafathStatusResponse {
  transId: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "FAILED";
  idNumber?: string;
  name?: string;
}

export interface NafathUserInfo {
  id: number;
  id_version: number;
  "first_name#ar": string;
  "father_name#ar": string;
  "grand_name#ar": string;
  "family_name#ar": string;
  "first_name#en": string;
  "father_name#en": string;
  "grand_name#en": string;
  "family_name#en": string;
  "two_names#ar": string;
  "two_names#en": string;
  "full_name#ar": string;
  "full_name#en": string;
  gender: string;
  "id_issue_date#g": string;
  "id_issue_date#h": number;
  "id_expiry_date#g": string;
  "id_expiry_date#h": number;
  language: string;
  nationality: number;
  "nationality#ar": string;
  "nationality#en": string;
  "dob#g": string;
  "dob#h": number;
  "card_issue_place#ar": string;
  "card_issue_place#en": string;
  "title_desc#ar": string | null;
  "title_desc#en": string | null;
}

export interface NafathUserDetails {
  user_info: NafathUserInfo;
  aud: string;
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
}

export interface NafathUser {
  id: string;
  name?: string | null;
  nationalId?: string | null;
  firstName?: string | null;
  fatherName?: string | null;
  grandName?: string | null;
  familyName?: string | null;
  fullName?: string | null;
  gender?: string | null;
  nationality?: string | null;
  idIssueDate?: string | null;
  idExpiryDate?: string | null;
  birthDateG?: string | null;
  birthDateH?: string | null;
  language?: string | null;
}
