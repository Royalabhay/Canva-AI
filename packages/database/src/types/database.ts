export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "owner" | "admin" | "editor" | "viewer";
export type AssetKind = "image" | "video" | "font" | "audio" | "document" | "other";
export type ActivityAction = "created" | "updated" | "deleted" | "duplicated" | "uploaded" | "exported" | "invited";

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate };
      organizations: { Row: Organization; Insert: OrganizationInsert; Update: OrganizationUpdate };
      workspaces: { Row: Workspace; Insert: WorkspaceInsert; Update: WorkspaceUpdate };
      workspace_members: { Row: WorkspaceMember; Insert: WorkspaceMemberInsert; Update: WorkspaceMemberUpdate };
      projects: { Row: Project; Insert: ProjectInsert; Update: ProjectUpdate };
      designs: { Row: Design; Insert: DesignInsert; Update: DesignUpdate };
      design_elements: { Row: DesignElement; Insert: DesignElementInsert; Update: DesignElementUpdate };
      design_versions: { Row: DesignVersion; Insert: DesignVersionInsert; Update: DesignVersionUpdate };
      assets: { Row: Asset; Insert: AssetInsert; Update: AssetUpdate };
      templates: { Row: Template; Insert: TemplateInsert; Update: TemplateUpdate };
      brand_kits: { Row: BrandKit; Insert: BrandKitInsert; Update: BrandKitUpdate };
      activity_logs: { Row: ActivityLog; Insert: ActivityLogInsert; Update: ActivityLogUpdate };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      workspace_role: Role;
      asset_kind: AssetKind;
      activity_action: ActivityAction;
    };
    CompositeTypes: Record<string, never>;
  };
}

export interface Timestamped { id: string; created_at: string; updated_at: string; deleted_at: string | null }
export interface Profile extends Timestamped { email: string; full_name: string | null; avatar_url: string | null }
export type ProfileInsert = Partial<Timestamped> & Pick<Profile, "id" | "email"> & Partial<Omit<Profile, keyof Timestamped | "id" | "email">>;
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>;

export interface Organization extends Timestamped { owner_id: string; name: string; slug: string; metadata: Json }
export type OrganizationInsert = Partial<Timestamped> & Pick<Organization, "owner_id" | "name" | "slug"> & Partial<Pick<Organization, "metadata">>;
export type OrganizationUpdate = Partial<Omit<Organization, "id" | "created_at" | "owner_id">>;

export interface Workspace extends Timestamped { organization_id: string | null; owner_id: string; name: string; slug: string; metadata: Json }
export type WorkspaceInsert = Partial<Timestamped> & Pick<Workspace, "owner_id" | "name" | "slug"> & Partial<Pick<Workspace, "organization_id" | "metadata">>;
export type WorkspaceUpdate = Partial<Omit<Workspace, "id" | "created_at" | "owner_id">>;

export interface WorkspaceMember extends Timestamped { workspace_id: string; user_id: string; role: Role; invited_by: string | null; accepted_at: string | null }
export type WorkspaceMemberInsert = Partial<Timestamped> & Pick<WorkspaceMember, "workspace_id" | "user_id"> & Partial<Omit<WorkspaceMember, keyof Timestamped | "workspace_id" | "user_id">>;
export type WorkspaceMemberUpdate = Partial<Omit<WorkspaceMember, "id" | "created_at" | "workspace_id" | "user_id">>;

export interface Project extends Timestamped { workspace_id: string; owner_id: string; name: string; slug: string; description: string | null; thumbnail_url: string | null; metadata: Json; last_opened_at: string | null }
export type ProjectInsert = Partial<Timestamped> & Pick<Project, "workspace_id" | "owner_id" | "name" | "slug"> & Partial<Omit<Project, keyof Timestamped | "workspace_id" | "owner_id" | "name" | "slug">>;
export type ProjectUpdate = Partial<Omit<Project, "id" | "created_at" | "workspace_id" | "owner_id">>;

export interface Design extends Timestamped { project_id: string; workspace_id: string; owner_id: string; name: string; fabric_json: Json; width: number; height: number; thumbnail_url: string | null; metadata: Json; autosaved_at: string | null; version: number }
export type DesignInsert = Partial<Timestamped> & Pick<Design, "project_id" | "workspace_id" | "owner_id" | "name"> & Partial<Omit<Design, keyof Timestamped | "project_id" | "workspace_id" | "owner_id" | "name">>;
export type DesignUpdate = Partial<Omit<Design, "id" | "created_at" | "project_id" | "workspace_id" | "owner_id">>;

export interface DesignElement extends Timestamped { design_id: string; workspace_id: string; fabric_object_id: string; object_type: string; properties: Json; z_index: number }
export type DesignElementInsert = Partial<Timestamped> & Pick<DesignElement, "design_id" | "workspace_id" | "fabric_object_id" | "object_type"> & Partial<Omit<DesignElement, keyof Timestamped | "design_id" | "workspace_id" | "fabric_object_id" | "object_type">>;
export type DesignElementUpdate = Partial<Omit<DesignElement, "id" | "created_at" | "design_id" | "workspace_id">>;

export interface DesignVersion extends Timestamped { design_id: string; workspace_id: string; version: number; fabric_json: Json; thumbnail_url: string | null; created_by: string | null; metadata: Json }
export type DesignVersionInsert = Partial<Timestamped> & Pick<DesignVersion, "design_id" | "workspace_id" | "version" | "fabric_json"> & Partial<Omit<DesignVersion, keyof Timestamped | "design_id" | "workspace_id" | "version" | "fabric_json">>;
export type DesignVersionUpdate = Partial<Omit<DesignVersion, "id" | "created_at" | "design_id" | "workspace_id">>;

export interface Asset extends Timestamped { workspace_id: string; owner_id: string; kind: AssetKind; bucket: string; path: string; filename: string; mime_type: string | null; size_bytes: number | null; width: number | null; height: number | null; public_url: string | null; metadata: Json }
export type AssetInsert = Partial<Timestamped> & Pick<Asset, "workspace_id" | "owner_id" | "kind" | "bucket" | "path" | "filename"> & Partial<Omit<Asset, keyof Timestamped | "workspace_id" | "owner_id" | "kind" | "bucket" | "path" | "filename">>;
export type AssetUpdate = Partial<Omit<Asset, "id" | "created_at" | "workspace_id" | "owner_id">>;

export interface Template extends Timestamped { workspace_id: string | null; owner_id: string | null; name: string; category: string | null; fabric_json: Json; thumbnail_url: string | null; is_public: boolean; metadata: Json }
export type TemplateInsert = Partial<Timestamped> & Pick<Template, "name" | "fabric_json"> & Partial<Omit<Template, keyof Timestamped | "name" | "fabric_json">>;
export type TemplateUpdate = Partial<Omit<Template, "id" | "created_at">>;

export interface BrandKit extends Timestamped { workspace_id: string; owner_id: string; name: string; colors: Json; fonts: Json; logos: Json; metadata: Json }
export type BrandKitInsert = Partial<Timestamped> & Pick<BrandKit, "workspace_id" | "owner_id" | "name"> & Partial<Omit<BrandKit, keyof Timestamped | "workspace_id" | "owner_id" | "name">>;
export type BrandKitUpdate = Partial<Omit<BrandKit, "id" | "created_at" | "workspace_id" | "owner_id">>;

export interface ActivityLog extends Timestamped { workspace_id: string; actor_id: string | null; action: ActivityAction; entity_type: string; entity_id: string | null; metadata: Json }
export type ActivityLogInsert = Partial<Timestamped> & Pick<ActivityLog, "workspace_id" | "action" | "entity_type"> & Partial<Omit<ActivityLog, keyof Timestamped | "workspace_id" | "action" | "entity_type">>;
export type ActivityLogUpdate = Partial<Omit<ActivityLog, "id" | "created_at">>;
