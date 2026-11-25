# Capabilities

Every method, source, action and bus event the manifest declares.

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `mcp:account_get_usage` | read | none | `account_get_usage` |
| `mcp:agents_add_pronunciation_dictionary_rules` | write | none | `agents_add_pronunciation_dictionary_rules` |
| `mcp:agents_add_triage_ticket_comment` | write | none | `agents_add_triage_ticket_comment` |
| `mcp:agents_add_triage_ticket_turn_comment` | write | none | `agents_add_triage_ticket_turn_comment` |
| `mcp:agents_add_workflow_node` | write | none | `agents_add_workflow_node` |
| `mcp:agents_append_to_string_field` | write | none | `agents_append_to_string_field` |
| `mcp:agents_attach_kb_document` | write | none | `agents_attach_kb_document` |
| `mcp:agents_attach_test` | write | none | `agents_attach_test` |
| `mcp:agents_attach_tool` | write | none | `agents_attach_tool` |
| `mcp:agents_bulk_delete_knowledge_base` | delete | none | `agents_bulk_delete_knowledge_base` |
| `mcp:agents_bulk_move_knowledge_base` | write | none | `agents_bulk_move_knowledge_base` |
| `mcp:agents_calculate_llm_usage` | read | none | `agents_calculate_llm_usage` |
| `mcp:agents_cancel_batch_call` | write | none | `agents_cancel_batch_call` |
| `mcp:agents_comment_on_merge_proposal` | write | none | `agents_comment_on_merge_proposal` |
| `mcp:agents_compute_kb_rag_index` | write | none | `agents_compute_kb_rag_index` |
| `mcp:agents_connect_workflow_nodes` | write | none | `agents_connect_workflow_nodes` |
| `mcp:agents_count_conversations` | read | none | `agents_count_conversations` |
| `mcp:agents_create` | write | none | `agents_create` |
| `mcp:agents_create_branch` | write | none | `agents_create_branch` |
| `mcp:agents_create_code_tool` | write | none | `agents_create_code_tool` |
| `mcp:agents_create_deployment` | write | none | `agents_create_deployment` |
| `mcp:agents_create_draft` | write | none | `agents_create_draft` |
| `mcp:agents_create_kb_crawl` | write | none | `agents_create_kb_crawl` |
| `mcp:agents_create_kb_folder` | write | none | `agents_create_kb_folder` |
| `mcp:agents_create_kb_text` | write | none | `agents_create_kb_text` |
| `mcp:agents_create_kb_url` | write | none | `agents_create_kb_url` |
| `mcp:agents_create_manual_triage_ticket` | write | none | `agents_create_manual_triage_ticket` |
| `mcp:agents_create_mcp_server` | write | none | `agents_create_mcp_server` |
| `mcp:agents_create_merge_proposal` | write | none | `agents_create_merge_proposal` |
| `mcp:agents_create_phone_number` | write | none | `agents_create_phone_number` |
| `mcp:agents_create_procedure` | write | none | `agents_create_procedure` |
| `mcp:agents_create_pronunciation_dictionary` | write | none | `agents_create_pronunciation_dictionary` |
| `mcp:agents_create_secret` | write | none | `agents_create_secret` |
| `mcp:agents_create_simulation_test` | write | none | `agents_create_simulation_test` |
| `mcp:agents_create_test` | write | none | `agents_create_test` |
| `mcp:agents_create_test_folder` | write | none | `agents_create_test_folder` |
| `mcp:agents_create_tool` | write | none | `agents_create_tool` |
| `mcp:agents_create_triage_ticket` | write | none | `agents_create_triage_ticket` |
| `mcp:agents_delete` | delete | none | `agents_delete` |
| `mcp:agents_delete_draft` | delete | none | `agents_delete_draft` |
| `mcp:agents_delete_kb_document` | delete | none | `agents_delete_kb_document` |
| `mcp:agents_delete_mcp_server` | delete | none | `agents_delete_mcp_server` |
| `mcp:agents_delete_phone_number` | delete | none | `agents_delete_phone_number` |
| `mcp:agents_delete_procedure` | delete | none | `agents_delete_procedure` |
| `mcp:agents_delete_procedure_draft` | delete | none | `agents_delete_procedure_draft` |
| `mcp:agents_delete_test` | delete | none | `agents_delete_test` |
| `mcp:agents_delete_tool` | delete | none | `agents_delete_tool` |
| `mcp:agents_delete_triage_ticket` | delete | none | `agents_delete_triage_ticket` |
| `mcp:agents_delete_workflow_element` | delete | none | `agents_delete_workflow_element` |
| `mcp:agents_detach_kb_document` | write | none | `agents_detach_kb_document` |
| `mcp:agents_detach_test` | write | none | `agents_detach_test` |
| `mcp:agents_detach_tool` | write | none | `agents_detach_tool` |
| `mcp:agents_disable_built_in_tool` | write | none | `agents_disable_built_in_tool` |
| `mcp:agents_duplicate` | write | none | `agents_duplicate` |
| `mcp:agents_duplicate_test` | write | none | `agents_duplicate_test` |
| `mcp:agents_edit_string_field` | write | none | `agents_edit_string_field` |
| `mcp:agents_generate` | write | none | `agents_generate` |
| `mcp:agents_generate_test_from_conversation` | write | none | `agents_generate_test_from_conversation` |
| `mcp:agents_get` | read | none | `agents_get` |
| `mcp:agents_get_alert` | read | none | `agents_get_alert` |
| `mcp:agents_get_batch_call` | read | none | `agents_get_batch_call` |
| `mcp:agents_get_branch` | read | none | `agents_get_branch` |
| `mcp:agents_get_branches_commit_status` | read | none | `agents_get_branches_commit_status` |
| `mcp:agents_get_config_summary` | read | none | `agents_get_config_summary` |
| `mcp:agents_get_connection_dependents` | read | none | `agents_get_connection_dependents` |
| `mcp:agents_get_conversation` | read | none | `agents_get_conversation` |
| `mcp:agents_get_conversation_audio_url` | read | none | `agents_get_conversation_audio_url` |
| `mcp:agents_get_conversation_summary` | read | none | `agents_get_conversation_summary` |
| `mcp:agents_get_draft` | read | none | `agents_get_draft` |
| `mcp:agents_get_insights_report` | read | none | `agents_get_insights_report` |
| `mcp:agents_get_kb_dependents` | read | none | `agents_get_kb_dependents` |
| `mcp:agents_get_kb_document` | read | none | `agents_get_kb_document` |
| `mcp:agents_get_kb_rag_indexes` | read | none | `agents_get_kb_rag_indexes` |
| `mcp:agents_get_knowledge_size` | read | none | `agents_get_knowledge_size` |
| `mcp:agents_get_latest_bi_report` | read | none | `agents_get_latest_bi_report` |
| `mcp:agents_get_link` | read | none | `agents_get_link` |
| `mcp:agents_get_mcp_server` | read | none | `agents_get_mcp_server` |
| `mcp:agents_get_memory` | read | none | `agents_get_memory` |
| `mcp:agents_get_merge_conflicts` | read | none | `agents_get_merge_conflicts` |
| `mcp:agents_get_merge_proposal` | read | none | `agents_get_merge_proposal` |
| `mcp:agents_get_overview_dashboard` | read | none | `agents_get_overview_dashboard` |
| `mcp:agents_get_phone_number` | read | none | `agents_get_phone_number` |
| `mcp:agents_get_procedure` | read | none | `agents_get_procedure` |
| `mcp:agents_get_procedure_draft` | read | none | `agents_get_procedure_draft` |
| `mcp:agents_get_pronunciation_dictionary` | read | none | `agents_get_pronunciation_dictionary` |
| `mcp:agents_get_rebase_conflicts` | read | none | `agents_get_rebase_conflicts` |
| `mcp:agents_get_settings` | read | none | `agents_get_settings` |
| `mcp:agents_get_signed_url` | export | none | `agents_get_signed_url` |
| `mcp:agents_get_structured_procedure_schema` | read | none | `agents_get_structured_procedure_schema` |
| `mcp:agents_get_subagent_dependents` | read | none | `agents_get_subagent_dependents` |
| `mcp:agents_get_summaries` | read | none | `agents_get_summaries` |
| `mcp:agents_get_test` | read | none | `agents_get_test` |
| `mcp:agents_get_test_result` | read | none | `agents_get_test_result` |
| `mcp:agents_get_test_result_summary` | read | none | `agents_get_test_result_summary` |
| `mcp:agents_get_test_run` | read | none | `agents_get_test_run` |
| `mcp:agents_get_test_run_failures` | read | none | `agents_get_test_run_failures` |
| `mcp:agents_get_test_run_summary` | read | none | `agents_get_test_run_summary` |
| `mcp:agents_get_tool` | read | none | `agents_get_tool` |
| `mcp:agents_get_tool_dependents` | read | none | `agents_get_tool_dependents` |
| `mcp:agents_get_tool_executions` | read | none | `agents_get_tool_executions` |
| `mcp:agents_get_topics` | read | none | `agents_get_topics` |
| `mcp:agents_get_topics_summary` | read | none | `agents_get_topics_summary` |
| `mcp:agents_get_triage_ticket` | read | none | `agents_get_triage_ticket` |
| `mcp:agents_get_triage_ticket_assignable_users` | read | none | `agents_get_triage_ticket_assignable_users` |
| `mcp:agents_get_usage_limits` | read | none | `agents_get_usage_limits` |
| `mcp:agents_get_version` | read | none | `agents_get_version` |
| `mcp:agents_get_whatsapp_account` | read | none | `agents_get_whatsapp_account` |
| `mcp:agents_get_widget` | read | none | `agents_get_widget` |
| `mcp:agents_list` | read | none | `agents_list` |
| `mcp:agents_list_alerts` | read | none | `agents_list_alerts` |
| `mcp:agents_list_batch_calls` | read | none | `agents_list_batch_calls` |
| `mcp:agents_list_branches` | read | none | `agents_list_branches` |
| `mcp:agents_list_channels` | read | none | `agents_list_channels` |
| `mcp:agents_list_conversations` | read | none | `agents_list_conversations` |
| `mcp:agents_list_deployments` | read | none | `agents_list_deployments` |
| `mcp:agents_list_knowledge_base` | read | none | `agents_list_knowledge_base` |
| `mcp:agents_list_llms` | read | none | `agents_list_llms` |
| `mcp:agents_list_mcp_server_tools` | read | none | `agents_list_mcp_server_tools` |
| `mcp:agents_list_mcp_servers` | read | none | `agents_list_mcp_servers` |
| `mcp:agents_list_memories` | read | none | `agents_list_memories` |
| `mcp:agents_list_merge_proposals` | read | none | `agents_list_merge_proposals` |
| `mcp:agents_list_phone_numbers` | read | none | `agents_list_phone_numbers` |
| `mcp:agents_list_procedures` | read | none | `agents_list_procedures` |
| `mcp:agents_list_pronunciation_dictionaries` | read | none | `agents_list_pronunciation_dictionaries` |
| `mcp:agents_list_secrets` | read | none | `agents_list_secrets` |
| `mcp:agents_list_test_runs` | read | none | `agents_list_test_runs` |
| `mcp:agents_list_tests` | read | none | `agents_list_tests` |
| `mcp:agents_list_tools` | read | none | `agents_list_tools` |
| `mcp:agents_list_triage_tickets` | read | none | `agents_list_triage_tickets` |
| `mcp:agents_list_trigger_connections` | read | none | `agents_list_trigger_connections` |
| `mcp:agents_list_webhooks` | read | none | `agents_list_webhooks` |
| `mcp:agents_list_whatsapp_accounts` | read | none | `agents_list_whatsapp_accounts` |
| `mcp:agents_merge_branch` | write | none | `agents_merge_branch` |
| `mcp:agents_merge_branch_preview` | read | none | `agents_merge_branch_preview` |
| `mcp:agents_merge_merge_proposal` | write | none | `agents_merge_merge_proposal` |
| `mcp:agents_move_tests` | write | none | `agents_move_tests` |
| `mcp:agents_outbound_call` | send | none | `agents_outbound_call` |
| `mcp:agents_publish_draft` | send | none | `agents_publish_draft` |
| `mcp:agents_query_analytics` | read | none | `agents_query_analytics` |
| `mcp:agents_query_knowledge_base_rag` | read | none | `agents_query_knowledge_base_rag` |
| `mcp:agents_query_workspace_conversations` | read | none | `agents_query_workspace_conversations` |
| `mcp:agents_read_string_field` | read | none | `agents_read_string_field` |
| `mcp:agents_rebase_branch` | write | none | `agents_rebase_branch` |
| `mcp:agents_rebase_branch_preview` | read | none | `agents_rebase_branch_preview` |
| `mcp:agents_remove_pronunciation_dictionary_rules` | delete | none | `agents_remove_pronunciation_dictionary_rules` |
| `mcp:agents_request_merge_proposal_review` | send | none | `agents_request_merge_proposal_review` |
| `mcp:agents_resolve_conversation` | read | none | `agents_resolve_conversation` |
| `mcp:agents_retry_batch_call` | send | none | `agents_retry_batch_call` |
| `mcp:agents_review_merge_proposal` | write | none | `agents_review_merge_proposal` |
| `mcp:agents_run_attached_tests` | write | none | `agents_run_attached_tests` |
| `mcp:agents_run_tests` | write | none | `agents_run_tests` |
| `mcp:agents_search_conversation_messages` | read | none | `agents_search_conversation_messages` |
| `mcp:agents_search_knowledge_base` | read | none | `agents_search_knowledge_base` |
| `mcp:agents_search_procedures` | read | none | `agents_search_procedures` |
| `mcp:agents_semantic_search_conversation_messages` | read | none | `agents_semantic_search_conversation_messages` |
| `mcp:agents_submit_batch_call` | send | none | `agents_submit_batch_call` |
| `mcp:agents_suggest_merge_proposal_reviewers` | read | none | `agents_suggest_merge_proposal_reviewers` |
| `mcp:agents_update` | write | none | `agents_update` |
| `mcp:agents_update_agent_behavior` | write | none | `agents_update_agent_behavior` |
| `mcp:agents_update_analysis` | write | none | `agents_update_analysis` |
| `mcp:agents_update_branch` | write | none | `agents_update_branch` |
| `mcp:agents_update_client_overrides` | write | none | `agents_update_client_overrides` |
| `mcp:agents_update_code_tool` | write | none | `agents_update_code_tool` |
| `mcp:agents_update_conversation` | write | none | `agents_update_conversation` |
| `mcp:agents_update_draft` | write | none | `agents_update_draft` |
| `mcp:agents_update_end_call_tool` | write | none | `agents_update_end_call_tool` |
| `mcp:agents_update_guardrails` | write | none | `agents_update_guardrails` |
| `mcp:agents_update_kb_document` | write | none | `agents_update_kb_document` |
| `mcp:agents_update_keypad_tone_tool` | write | none | `agents_update_keypad_tone_tool` |
| `mcp:agents_update_language_detection_tool` | write | none | `agents_update_language_detection_tool` |
| `mcp:agents_update_language_presets` | write | none | `agents_update_language_presets` |
| `mcp:agents_update_mcp_server` | write | none | `agents_update_mcp_server` |
| `mcp:agents_update_merge_proposal` | write | none | `agents_update_merge_proposal` |
| `mcp:agents_update_operations` | write | none | `agents_update_operations` |
| `mcp:agents_update_phone_number` | write | none | `agents_update_phone_number` |
| `mcp:agents_update_procedure_draft` | write | none | `agents_update_procedure_draft` |
| `mcp:agents_update_procedure_visibility` | write | none | `agents_update_procedure_visibility` |
| `mcp:agents_update_prompt_settings` | write | none | `agents_update_prompt_settings` |
| `mcp:agents_update_secret` | write | none | `agents_update_secret` |
| `mcp:agents_update_settings` | write | none | `agents_update_settings` |
| `mcp:agents_update_skip_turn_tool` | write | none | `agents_update_skip_turn_tool` |
| `mcp:agents_update_speech_recognition` | write | none | `agents_update_speech_recognition` |
| `mcp:agents_update_subagents` | write | none | `agents_update_subagents` |
| `mcp:agents_update_test` | write | none | `agents_update_test` |
| `mcp:agents_update_tool` | write | none | `agents_update_tool` |
| `mcp:agents_update_transfer_to_agent_tool` | write | none | `agents_update_transfer_to_agent_tool` |
| `mcp:agents_update_transfer_to_number_tool` | write | none | `agents_update_transfer_to_number_tool` |
| `mcp:agents_update_triage_ticket` | write | none | `agents_update_triage_ticket` |
| `mcp:agents_update_turn_taking` | write | none | `agents_update_turn_taking` |
| `mcp:agents_update_voice` | write | none | `agents_update_voice` |
| `mcp:agents_update_voicemail_detection_tool` | write | none | `agents_update_voicemail_detection_tool` |
| `mcp:agents_update_whatsapp_account` | send | none | `agents_update_whatsapp_account` |
| `mcp:agents_update_widget` | write | none | `agents_update_widget` |
| `mcp:agents_update_workflow` | write | none | `agents_update_workflow` |
| `mcp:agents_update_workflow_edge` | write | none | `agents_update_workflow_edge` |
| `mcp:agents_update_workflow_node` | write | none | `agents_update_workflow_node` |
| `mcp:creative_add_brand_kit_item` | write | none | `creative_add_brand_kit_item` |
| `mcp:creative_add_flow_asset_node` | write | none | `creative_add_flow_asset_node` |
| `mcp:creative_add_flow_node` | write | none | `creative_add_flow_node` |
| `mcp:creative_attach_reference_file` | write | none | `creative_attach_reference_file` |
| `mcp:creative_connect_flow_nodes` | write | none | `creative_connect_flow_nodes` |
| `mcp:creative_create_asset_upload` | write | none | `creative_create_asset_upload` |
| `mcp:creative_create_brand_kit` | write | none | `creative_create_brand_kit` |
| `mcp:creative_create_brand_kit_from_website` | write | none | `creative_create_brand_kit_from_website` |
| `mcp:creative_create_flow` | write | none | `creative_create_flow` |
| `mcp:creative_delete_brand_kit` | delete | none | `creative_delete_brand_kit` |
| `mcp:creative_delete_brand_kit_item` | delete | none | `creative_delete_brand_kit_item` |
| `mcp:creative_delete_flow_nodes` | delete | none | `creative_delete_flow_nodes` |
| `mcp:creative_design_voice` | write | none | `creative_design_voice` |
| `mcp:creative_disconnect_flow_nodes` | write | none | `creative_disconnect_flow_nodes` |
| `mcp:creative_duplicate_flow_nodes` | write | none | `creative_duplicate_flow_nodes` |
| `mcp:creative_edit_image` | write | none | `creative_edit_image` |
| `mcp:creative_execute_sandbox` | write | none | `creative_execute_sandbox` |
| `mcp:creative_finalize_asset_upload` | write | none | `creative_finalize_asset_upload` |
| `mcp:creative_generate_image` | write | none | `creative_generate_image` |
| `mcp:creative_generate_in_flow` | write | none | `creative_generate_in_flow` |
| `mcp:creative_generate_speech` | write | none | `creative_generate_speech` |
| `mcp:creative_generate_video` | write | none | `creative_generate_video` |
| `mcp:creative_get_available_assets` | read | none | `creative_get_available_assets` |
| `mcp:creative_get_brand_kit` | read | none | `creative_get_brand_kit` |
| `mcp:creative_get_flow` | read | none | `creative_get_flow` |
| `mcp:creative_get_flow_node` | read | none | `creative_get_flow_node` |
| `mcp:creative_get_flow_node_types` | read | none | `creative_get_flow_node_types` |
| `mcp:creative_get_flow_run_status` | read | none | `creative_get_flow_run_status` |
| `mcp:creative_get_generations` | read | none | `creative_get_generations` |
| `mcp:creative_get_guide` | read | none | `creative_get_guide` |
| `mcp:creative_get_model_guide` | read | none | `creative_get_model_guide` |
| `mcp:creative_get_model_schema` | read | none | `creative_get_model_schema` |
| `mcp:creative_get_sandbox_run` | write | none | `creative_get_sandbox_run` |
| `mcp:creative_get_view_state` | read | none | `creative_get_view_state` |
| `mcp:creative_get_voice_design_previews` | read | none | `creative_get_voice_design_previews` |
| `mcp:creative_list_brand_kits` | read | none | `creative_list_brand_kits` |
| `mcp:creative_list_flows` | read | none | `creative_list_flows` |
| `mcp:creative_list_voices` | read | none | `creative_list_voices` |
| `mcp:creative_run_flow_nodes` | write | none | `creative_run_flow_nodes` |
| `mcp:creative_save_designed_voice` | write | none | `creative_save_designed_voice` |
| `mcp:creative_save_view_state` | write | none | `creative_save_view_state` |
| `mcp:creative_show_flow_results` | read | none | `creative_show_flow_results` |
| `mcp:creative_transcribe_audio` | read | none | `creative_transcribe_audio` |
| `mcp:creative_update_brand_kit` | write | none | `creative_update_brand_kit` |
| `mcp:creative_update_brand_kit_item` | write | none | `creative_update_brand_kit_item` |
| `mcp:creative_update_flow_nodes` | write | none | `creative_update_flow_nodes` |
| `mcp:creative_update_node` | write | none | `creative_update_node` |
| `mcp:creative_upload_flow_reference` | write | none | `creative_upload_flow_reference` |
| `mcp:get_more_tools` | write | none | `get_more_tools` |
| `events_list` | read | optional | `agents_list_conversations`, `agents_list`, `agents_get` |
| `probe` | read | optional | — |
| `status` | read | none | — |
| `save_media` | export | none | — |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `elevenlabs.conversations` | events | `session` | `events_list` | free |
| `elevenlabs.conversations.list` | snapshot | `list` | `events_list` | free |

### Actions

None.

### Bus events

`rpc.elevenlabs.status`, `rpc.elevenlabs.account`
<!-- /generated:capabilities -->

## Own methods

- **`status`** answers the contract's status: the host range, every alias's sign-in state and owner, and the agents that
  lack the plugin's access rules. It takes no account and reads no provider content.
- **`probe`** answers who is signed in to one alias: the owner is OpenCode's credential for that alias's MCP server,
  marked `verified: false` because ElevenLabs names no account. It calls ElevenLabs for nothing.
- **`events_list`** reads `elevenlabs.conversations`: calls as metadata-only events, oldest first, with a cursor bound
  to the plugin, source and account. Its `list: "conversations"` input reads
  `elevenlabs.conversations.list`, a 50-item list snapshot for an app; that form is an RPC read and a model tool refuses it.
- **`save_media`** downloads a generated file from a signed `elevenlabsusercontent.com` link and writes it under
  `mediaRoot`. It is an `export`: the plugin makes no API call, and the file is the only thing that leaves the model's reach.

## Pass-through methods

The 245 `mcp:<tool>` rows are ElevenLabs' own hosted tools, classified from their names and descriptions: reads, writes,
sends, deletes, one export and the two spending reads that ask. The plugin does not register or proxy them; the vendor's
MCP server owns them, and OpenCode names them `<server>_<tool>` — `elevenlabs_agents_list` for `default`,
`elevenlabs-work_agents_list` for the alias `work`, and so on. `agents_outbound_call`, `agents_publish_draft`,
`agents_request_merge_proposal_review`, `agents_retry_batch_call`, `agents_submit_batch_call` and
`agents_update_whatsapp_account` are `send`: they reach people outside this conversation. `agents_get_signed_url` is the
one `export`: it mints a credential-like link.

## Sources

`elevenlabs.conversations` reads `agents_list_conversations` (the calls), `agents_list` and `agents_get` (each agent's
retention, which decides the page's one `gap`). All three are free reads. `elevenlabs.conversations.list` reads only
`agents_list_conversations`.

## Bus

The plugin emits `rpc.elevenlabs.account` when an alias's sign-in state changes and `rpc.elevenlabs.status` when the
plugin's overall state does. Both are nudges with no content; an app re-reads `status` or `probe`.
