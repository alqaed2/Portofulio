export interface ProjectDetails {
  location: string;
  area: string;
  scope: string;
  tech: string;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  desc: string;
  image: string;
  details: ProjectDetails;
  highlights: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface BlueprintRoom {
  id: string;
  name: string;
  arabicName: string;
  x: number; // grid column start
  y: number; // grid row start
  w: number; // grid width span
  h: number; // grid height span
  elevation: number; // height offset
  color: string;
  details: string;
  technicalDetails: string;
}
