export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

type ProfileRow = {
	id: string;
	user_id: string | null;
	full_name: string | null;
	email: string | null;
	role: string | null;
	status: string | null;
	created_at: string | null;
	updated_at: string | null;
};

type ProjectRow = {
	id: string;
	project_id: string | null;
	customer: string | null;
	project_name: string | null;
	project_reference: string | null;
	project_manager: string | null;
	account_manager: string | null;
	pcs_status: string | null;
	project_category: string | null;
	client_po_date: string | null;
	contract_date: string | null;
	first_issued_date: string | null;
	project_start_date: string | null;
	project_end_date: string | null;
	golive_date: string | null;
	actual_golive_date: string | null;
	warranty_end_date: string | null;
	actual_warranty_end_date: string | null;
	maintenance_end_date: string | null;
	main_delivery_team: string | null;
	pqi_time: number | null;
	pqi_time_r_0: number | null;
	pqi_cost: number | null;
	pqi_cost_r_0: number | null;
	pqi: number | null;
	pqi_r0: number | null;
	schedule_health: string | null;
	financial_health: string | null;
	total_sales: number | null;
	gross_profit: number | null;
	npp: number | null;
	npp_actual: number | null;
	budget_by_progress: number | null;
	total_budget: number | null;
	budget_usage: number | null;
	variance_budget_usage: number | null;
	modified_date: string | null;
	progress_date: string | null;
	percentage_progress: number | null;
	current_stage: string | null;
	progress_note: string | null;
	sales_osl: number | null;
	sales_3sw: number | null;
	sales_3sv: number | null;
	sales_3hw: number | null;
	sales_osv_osl: number | null;
	sales_osv_nonosl: number | null;
	sales_need_invoice_as_june_2020: number | null;
	gp_osl: number | null;
	gp_3sw: number | null;
	gp_3sv: number | null;
	gp_3hw: number | null;
	gp_osv_osl: number | null;
	gp_osv_nonosl: number | null;
	gp_need_invoice_as_june_2020: number | null;
	batch_number: number | null;
	upload_date: string | null;
	category: string | null;
	category_note: string | null;
	created_at: string | null;
};

type ProjectTargetRow = {
	id: string;
	target_id: number | null;
	company_name: string | null;
	project_id: string | null;
	customer: string | null;
	project_name: string | null;
	project_manager: string | null;
	account_manager: string | null;
	group_am: string | null;
	is_po: string | null;
	is_contract: string | null;
	term_of_payment_sales: string | null;
	invoice_status: string | null;
	project_category: string | null;
	project_tracking: string | null;
	total: number | null;
	gp_acc: number | null;
	net_profit_project: number | null;
	npp_actual: number | null;
	client_po_date: string | null;
	invoice_number: string | null;
	invoice_date: string | null;
	payment_date: string | null;
	target_date: string | null;
	target_invoice_r0: string | null;
	aging_invoice: number | null;
	count_target_change: number | null;
	history_update_target_date: string | null;
	last_update: string | null;
	reason_update: string | null;
	status: string | null;
	category: string | null;
	category_note: string | null;
	batch_number: number | null;
	upload_date: string | null;
	created_at: string | null;
};

type ProspectRow = {
	id: string;
	id_top_sales: number | null;
	am_name: string | null;
	company_name: string | null;
	directorat: string | null;
	group_name: string | null;
	id_project: string | null;
	id_prospect_status: number | null;
	prospect_name: string | null;
	client_name: string | null;
	status: string | null;
	term_of_payment: string | null;
	amount: number | null;
	gp: number | null;
	amount_cl: number | null;
	gp_cl: number | null;
	est_prospect_close_date: string | null;
	target_date: string | null;
	confidence_level: number | null;
	osv_non_osl: number | null;
	opr_del: number | null;
	batch_number: number | null;
	upload_date: string | null;
	category: string | null;
	category_note: string | null;
	created_at: string | null;
};

type DashboardStatItem = { name: string; value: number };
type DashboardBudgetItem = { name: string; budget: number; usage: number };

type DashboardSummaryRow = {
	total: number | string | null;
	avg_progress: number | string | null;
	avg_pqi_time: number | string | null;
	avg_pqi_cost: number | string | null;
	pqi_time_data: DashboardStatItem[] | null;
	pqi_cost_data: DashboardStatItem[] | null;
	sched_data: DashboardStatItem[] | null;
	fin_data: DashboardStatItem[] | null;
	progress_data: Array<{ name: string; count: number }> | null;
	pm_data: DashboardStatItem[] | null;
	cat_data: DashboardStatItem[] | null;
	budget_data: DashboardBudgetItem[] | null;
	total_gross_profit: number | string | null;
};

type SalesPerformanceRow = {
	sales_person: string;
	am_target: number;
	backlog: number;
	prospect_pipeline: number;
	total_opportunity: number;
	achievement_percent: number;
};

export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: ProfileRow;
				Insert: Partial<ProfileRow>;
				Update: Partial<ProfileRow>;
				Relationships: [];
			};
			projects: {
				Row: ProjectRow;
				Insert: Partial<ProjectRow>;
				Update: Partial<ProjectRow>;
				Relationships: [];
			};
			project_targets: {
				Row: ProjectTargetRow;
				Insert: Partial<ProjectTargetRow>;
				Update: Partial<ProjectTargetRow>;
				Relationships: [];
			};
			prospects: {
				Row: ProspectRow;
				Insert: Partial<ProspectRow>;
				Update: Partial<ProspectRow>;
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			get_latest_batch: {
				Args: { p_table_id: string };
				Returns: number;
			};
			get_dashboard_summary: {
				Args: Record<PropertyKey, never>;
				Returns: DashboardSummaryRow[];
			};
			get_backlog_subtotals: {
				Args: {
					p_batch_number: number;
					p_search_query: string;
					p_start_date: string | null;
					p_end_date: string | null;
					p_invoice_date_empty: boolean;
					p_category_filter: string;
				};
				Returns: Array<{ sum_total: number; sum_gp_acc: number }>;
			};
			get_prospects_subtotals: {
				Args: {
					p_batch_number: number;
					p_allowed_ams: string[];
					p_search_query: string;
					p_start_date: string | null;
					p_end_date: string | null;
					p_category_filter: string;
				};
				Returns: Array<{ sum_amount: number; sum_gp: number }>;
			};
			get_sales_performance_summary: {
				Args: {
					p_start_date: string | null;
					p_end_date: string | null;
				};
				Returns: SalesPerformanceRow[];
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][T]["Row"];
