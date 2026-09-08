export type Json =
	string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			admin_members: {
				Row: {
					activated_at: string | null;
					created_at: string;
					created_by: string | null;
					deleted_at: string | null;
					deleted_by: string | null;
					disabled_at: string | null;
					invited_at: string;
					role: Database["public"]["Enums"]["admin_role"];
					status: Database["public"]["Enums"]["admin_member_status"];
					updated_at: string;
					updated_by: string | null;
					user_id: string;
					version: number;
				};
				Insert: {
					activated_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					deleted_by?: string | null;
					disabled_at?: string | null;
					invited_at?: string;
					role: Database["public"]["Enums"]["admin_role"];
					status?: Database["public"]["Enums"]["admin_member_status"];
					updated_at?: string;
					updated_by?: string | null;
					user_id: string;
					version?: number;
				};
				Update: {
					activated_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					deleted_by?: string | null;
					disabled_at?: string | null;
					invited_at?: string;
					role?: Database["public"]["Enums"]["admin_role"];
					status?: Database["public"]["Enums"]["admin_member_status"];
					updated_at?: string;
					updated_by?: string | null;
					user_id?: string;
					version?: number;
				};
				Relationships: [];
			};
			audit_events: {
				Row: {
					action: string;
					actor_id: string | null;
					actor_role: Database["public"]["Enums"]["admin_role"] | null;
					details: Json;
					id: number;
					occurred_at: string;
					request_id: string | null;
					resource_id: string | null;
					resource_type: string;
				};
				Insert: {
					action: string;
					actor_id?: string | null;
					actor_role?: Database["public"]["Enums"]["admin_role"] | null;
					details?: Json;
					id?: never;
					occurred_at?: string;
					request_id?: string | null;
					resource_id?: string | null;
					resource_type: string;
				};
				Update: {
					action?: string;
					actor_id?: string | null;
					actor_role?: Database["public"]["Enums"]["admin_role"] | null;
					details?: Json;
					id?: never;
					occurred_at?: string;
					request_id?: string | null;
					resource_id?: string | null;
					resource_type?: string;
				};
				Relationships: [];
			};
			properties: {
				Row: {
					archived_at: string | null;
					bathrooms: number | null;
					bedrooms: number | null;
					city: string;
					created_at: string;
					created_by: string | null;
					deal_status: Database["public"]["Enums"]["deal_status"];
					deleted_at: string | null;
					deleted_by: string | null;
					description: string;
					featured: boolean;
					features: string[];
					id: string;
					land_area_sqm: number | null;
					neighborhood: string;
					parking_spaces: number | null;
					price_display: Database["public"]["Enums"]["price_display"];
					price_in_cents: number | null;
					private_area_sqm: number | null;
					property_type: string;
					public_code: string;
					publication_status: Database["public"]["Enums"]["publication_status"];
					published_at: string | null;
					purpose: Database["public"]["Enums"]["property_purpose"];
					slug: string;
					suites: number | null;
					title: string;
					total_area_sqm: number | null;
					updated_at: string;
					updated_by: string | null;
					version: number;
				};
				Insert: {
					archived_at?: string | null;
					bathrooms?: number | null;
					bedrooms?: number | null;
					city: string;
					created_at?: string;
					created_by?: string | null;
					deal_status?: Database["public"]["Enums"]["deal_status"];
					deleted_at?: string | null;
					deleted_by?: string | null;
					description?: string;
					featured?: boolean;
					features?: string[];
					id?: string;
					land_area_sqm?: number | null;
					neighborhood: string;
					parking_spaces?: number | null;
					price_display?: Database["public"]["Enums"]["price_display"];
					price_in_cents?: number | null;
					private_area_sqm?: number | null;
					property_type: string;
					public_code: string;
					publication_status?: Database["public"]["Enums"]["publication_status"];
					published_at?: string | null;
					purpose: Database["public"]["Enums"]["property_purpose"];
					slug: string;
					suites?: number | null;
					title: string;
					total_area_sqm?: number | null;
					updated_at?: string;
					updated_by?: string | null;
					version?: number;
				};
				Update: {
					archived_at?: string | null;
					bathrooms?: number | null;
					bedrooms?: number | null;
					city?: string;
					created_at?: string;
					created_by?: string | null;
					deal_status?: Database["public"]["Enums"]["deal_status"];
					deleted_at?: string | null;
					deleted_by?: string | null;
					description?: string;
					featured?: boolean;
					features?: string[];
					id?: string;
					land_area_sqm?: number | null;
					neighborhood?: string;
					parking_spaces?: number | null;
					price_display?: Database["public"]["Enums"]["price_display"];
					price_in_cents?: number | null;
					private_area_sqm?: number | null;
					property_type?: string;
					public_code?: string;
					publication_status?: Database["public"]["Enums"]["publication_status"];
					published_at?: string | null;
					purpose?: Database["public"]["Enums"]["property_purpose"];
					slug?: string;
					suites?: number | null;
					title?: string;
					total_area_sqm?: number | null;
					updated_at?: string;
					updated_by?: string | null;
					version?: number;
				};
				Relationships: [];
			};
			property_media: {
				Row: {
					alt_text: string;
					checksum_sha256: string | null;
					created_at: string;
					created_by: string | null;
					deleted_at: string | null;
					deleted_by: string | null;
					id: string;
					is_approved_for_publication: boolean;
					is_cover: boolean;
					media_kind: Database["public"]["Enums"]["property_media_kind"];
					original_bucket_id: string | null;
					original_checksum_sha256: string | null;
					original_byte_size: number | null;
					original_height: number | null;
					original_mime_type: string | null;
					original_object_path: string | null;
					original_width: number | null;
					processed_at: string | null;
					processing_status: Database["public"]["Enums"]["media_processing_status"];
					property_id: string;
					public_bucket_id: string | null;
					public_byte_size: number | null;
					public_height: number | null;
					public_id: string;
					public_mime_type: string | null;
					public_object_path: string | null;
					public_width: number | null;
					publication_authorized_at: string | null;
					publication_authorized_by: string | null;
					sort_order: number;
					updated_at: string;
					updated_by: string | null;
					version: number;
					video_id: string | null;
					video_provider: Database["public"]["Enums"]["video_provider"] | null;
					video_treated_at: string | null;
					watermark_version: string | null;
				};
				Insert: {
					alt_text: string;
					checksum_sha256?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					deleted_by?: string | null;
					id?: string;
					is_approved_for_publication?: boolean;
					is_cover?: boolean;
					media_kind: Database["public"]["Enums"]["property_media_kind"];
					original_bucket_id?: string | null;
					original_checksum_sha256?: string | null;
					original_byte_size?: number | null;
					original_height?: number | null;
					original_mime_type?: string | null;
					original_object_path?: string | null;
					original_width?: number | null;
					processed_at?: string | null;
					processing_status?: Database["public"]["Enums"]["media_processing_status"];
					property_id: string;
					public_bucket_id?: string | null;
					public_byte_size?: number | null;
					public_height?: number | null;
					public_id?: string;
					public_mime_type?: string | null;
					public_object_path?: string | null;
					public_width?: number | null;
					publication_authorized_at?: string | null;
					publication_authorized_by?: string | null;
					sort_order?: number;
					updated_at?: string;
					updated_by?: string | null;
					version?: number;
					video_id?: string | null;
					video_provider?: Database["public"]["Enums"]["video_provider"] | null;
					video_treated_at?: string | null;
					watermark_version?: string | null;
				};
				Update: {
					alt_text?: string;
					checksum_sha256?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					deleted_by?: string | null;
					id?: string;
					is_approved_for_publication?: boolean;
					is_cover?: boolean;
					media_kind?: Database["public"]["Enums"]["property_media_kind"];
					original_bucket_id?: string | null;
					original_checksum_sha256?: string | null;
					original_byte_size?: number | null;
					original_height?: number | null;
					original_mime_type?: string | null;
					original_object_path?: string | null;
					original_width?: number | null;
					processed_at?: string | null;
					processing_status?: Database["public"]["Enums"]["media_processing_status"];
					property_id?: string;
					public_bucket_id?: string | null;
					public_byte_size?: number | null;
					public_height?: number | null;
					public_id?: string;
					public_mime_type?: string | null;
					public_object_path?: string | null;
					public_width?: number | null;
					publication_authorized_at?: string | null;
					publication_authorized_by?: string | null;
					sort_order?: number;
					updated_at?: string;
					updated_by?: string | null;
					version?: number;
					video_id?: string | null;
					video_provider?: Database["public"]["Enums"]["video_provider"] | null;
					video_treated_at?: string | null;
					watermark_version?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "property_media_property_id_fkey";
						columns: ["property_id"];
						isOneToOne: false;
						referencedRelation: "properties";
						referencedColumns: ["id"];
					},
				];
			};
			property_private_details: {
				Row: {
					address_complement: string | null;
					address_line: string | null;
					address_number: string | null;
					authorization_confirmed_at: string | null;
					authorization_confirmed_by: string | null;
					authorization_reference: string | null;
					created_at: string;
					created_by: string | null;
					deleted_at: string | null;
					deleted_by: string | null;
					exact_latitude: number | null;
					exact_longitude: number | null;
					internal_notes: string | null;
					owner_contact: string | null;
					owner_name: string | null;
					postal_code: string | null;
					property_id: string;
					updated_at: string;
					updated_by: string | null;
					version: number;
				};
				Insert: {
					address_complement?: string | null;
					address_line?: string | null;
					address_number?: string | null;
					authorization_confirmed_at?: string | null;
					authorization_confirmed_by?: string | null;
					authorization_reference?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					deleted_by?: string | null;
					exact_latitude?: number | null;
					exact_longitude?: number | null;
					internal_notes?: string | null;
					owner_contact?: string | null;
					owner_name?: string | null;
					postal_code?: string | null;
					property_id: string;
					updated_at?: string;
					updated_by?: string | null;
					version?: number;
				};
				Update: {
					address_complement?: string | null;
					address_line?: string | null;
					address_number?: string | null;
					authorization_confirmed_at?: string | null;
					authorization_confirmed_by?: string | null;
					authorization_reference?: string | null;
					created_at?: string;
					created_by?: string | null;
					deleted_at?: string | null;
					deleted_by?: string | null;
					exact_latitude?: number | null;
					exact_longitude?: number | null;
					internal_notes?: string | null;
					owner_contact?: string | null;
					owner_name?: string | null;
					postal_code?: string | null;
					property_id?: string;
					updated_at?: string;
					updated_by?: string | null;
					version?: number;
				};
				Relationships: [
					{
						foreignKeyName: "property_private_details_property_id_fkey";
						columns: ["property_id"];
						isOneToOne: true;
						referencedRelation: "properties";
						referencedColumns: ["id"];
					},
				];
			};
			public_property_catalog: {
				Row: {
					bathrooms: number | null;
					bedrooms: number | null;
					city: string;
					deal_status: Database["public"]["Enums"]["deal_status"];
					description: string;
					featured: boolean;
					features: string[];
					land_area_sqm: number | null;
					neighborhood: string;
					parking_spaces: number | null;
					price_display: Database["public"]["Enums"]["price_display"];
					price_in_cents: number | null;
					private_area_sqm: number | null;
					property_type: string;
					public_code: string;
					published_at: string;
					purpose: Database["public"]["Enums"]["property_purpose"];
					slug: string;
					suites: number | null;
					title: string;
					total_area_sqm: number | null;
				};
				Insert: {
					bathrooms?: number | null;
					bedrooms?: number | null;
					city: string;
					deal_status: Database["public"]["Enums"]["deal_status"];
					description: string;
					featured: boolean;
					features: string[];
					land_area_sqm?: number | null;
					neighborhood: string;
					parking_spaces?: number | null;
					price_display: Database["public"]["Enums"]["price_display"];
					price_in_cents?: number | null;
					private_area_sqm?: number | null;
					property_type: string;
					public_code: string;
					published_at: string;
					purpose: Database["public"]["Enums"]["property_purpose"];
					slug: string;
					suites?: number | null;
					title: string;
					total_area_sqm?: number | null;
				};
				Update: {
					bathrooms?: number | null;
					bedrooms?: number | null;
					city?: string;
					deal_status?: Database["public"]["Enums"]["deal_status"];
					description?: string;
					featured?: boolean;
					features?: string[];
					land_area_sqm?: number | null;
					neighborhood?: string;
					parking_spaces?: number | null;
					price_display?: Database["public"]["Enums"]["price_display"];
					price_in_cents?: number | null;
					private_area_sqm?: number | null;
					property_type?: string;
					public_code?: string;
					published_at?: string;
					purpose?: Database["public"]["Enums"]["property_purpose"];
					slug?: string;
					suites?: number | null;
					title?: string;
					total_area_sqm?: number | null;
				};
				Relationships: [];
			};
			public_property_media: {
				Row: {
					alt_text: string;
					is_cover: boolean;
					media_code: string;
					media_kind: Database["public"]["Enums"]["property_media_kind"];
					property_code: string;
					public_object_path: string | null;
					sort_order: number;
					video_id: string | null;
					video_provider: Database["public"]["Enums"]["video_provider"] | null;
				};
				Insert: {
					alt_text: string;
					is_cover: boolean;
					media_code: string;
					media_kind: Database["public"]["Enums"]["property_media_kind"];
					property_code: string;
					public_object_path?: string | null;
					sort_order: number;
					video_id?: string | null;
					video_provider?: Database["public"]["Enums"]["video_provider"] | null;
				};
				Update: {
					alt_text?: string;
					is_cover?: boolean;
					media_code?: string;
					media_kind?: Database["public"]["Enums"]["property_media_kind"];
					property_code?: string;
					public_object_path?: string | null;
					sort_order?: number;
					video_id?: string | null;
					video_provider?: Database["public"]["Enums"]["video_provider"] | null;
				};
				Relationships: [
					{
						foreignKeyName: "public_property_media_property_code_fkey";
						columns: ["property_code"];
						isOneToOne: false;
						referencedRelation: "public_property_catalog";
						referencedColumns: ["public_code"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			activate_own_admin_membership: {
				Args: Record<PropertyKey, never>;
				Returns: boolean;
			};
			search_public_properties: {
				Args: {
					p_city?: string | null;
					p_deal_status?: Database["public"]["Enums"]["deal_status"] | null;
					p_maximum_price_in_cents?: number | null;
					p_minimum_bedrooms?: number | null;
					p_minimum_parking_spaces?: number | null;
					p_minimum_price_in_cents?: number | null;
					p_neighborhood?: string | null;
					p_page?: number;
					p_page_size?: number;
					p_property_type?: string | null;
					p_public_code?: string | null;
					p_purpose?: Database["public"]["Enums"]["property_purpose"] | null;
					p_search_query: string;
				};
				Returns: Array<
					Database["public"]["Tables"]["public_property_catalog"]["Row"] & {
						search_rank: number;
						total_count: number;
					}
				>;
			};
			confirm_property_image: {
				Args: {
					p_expected_version: number;
					p_is_cover: boolean;
					p_media_id: string;
					p_property_id: string;
				};
				Returns: Database["public"]["Tables"]["property_media"]["Row"];
			};
			publish_property: {
				Args: {
					p_authorization_confirmed: boolean;
					p_expected_version: number;
					p_property_id: string;
				};
				Returns: Database["public"]["Tables"]["properties"]["Row"];
			};
			update_property_media_metadata: {
				Args: {
					p_alt_text: string;
					p_expected_version: number;
					p_is_cover: boolean;
					p_media_id: string;
					p_property_id: string;
					p_sort_order: number;
				};
				Returns: Database["public"]["Tables"]["property_media"]["Row"];
			};
		};
		Enums: {
			admin_member_status: "invited" | "active" | "disabled";
			admin_role: "owner" | "editor";
			deal_status: "available" | "reserved" | "sold";
			media_processing_status: "planned" | "processed" | "rejected";
			price_display: "show" | "on_request";
			property_media_kind: "image" | "video";
			property_purpose: "sale" | "rent";
			publication_status: "draft" | "published" | "archived";
			video_provider: "youtube" | "vimeo";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never) = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			admin_member_status: ["invited", "active", "disabled"],
			admin_role: ["owner", "editor"],
			deal_status: ["available", "reserved", "sold"],
			media_processing_status: ["planned", "processed", "rejected"],
			price_display: ["show", "on_request"],
			property_media_kind: ["image", "video"],
			property_purpose: ["sale", "rent"],
			publication_status: ["draft", "published", "archived"],
			video_provider: ["youtube", "vimeo"],
		},
	},
} as const;
