provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}

# Variables
variable "mongodb_atlas_public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
}

variable "mongodb_atlas_private_key" {
  description = "MongoDB Atlas API private key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
}

variable "mongodb_atlas_project_name" {
  description = "MongoDB Atlas project name"
  type        = string
  default     = "english-conversation-management"
}

variable "mongodb_atlas_region" {
  description = "MongoDB Atlas region"
  type        = string
  default     = "AP_NORTHEAST_2" # Seoul region
}

variable "mongodb_atlas_cluster_name" {
  description = "MongoDB Atlas cluster name"
  type        = string
  default     = "english-conversation-cluster"
}

# MongoDB Atlas Project
resource "mongodbatlas_project" "project" {
  name   = var.mongodb_atlas_project_name
  org_id = var.mongodb_atlas_org_id
}

# MongoDB Atlas Cluster
resource "mongodbatlas_cluster" "cluster" {
  project_id = mongodbatlas_project.project.id
  name       = var.mongodb_atlas_cluster_name

  # M10 cluster tier (adjust based on your needs)
  provider_name               = "TENANT"
  backing_provider_name       = "AWS"
  provider_region_name        = var.mongodb_atlas_region
  provider_instance_size_name = "M10"

  # Cluster configuration
  mongo_db_major_version = "6.0"
  auto_scaling_disk_gb_enabled = true
  
  # Backup policy
  pit_enabled = true
  
  # Advanced configuration
  advanced_configuration {
    javascript_enabled                   = true
    minimum_enabled_tls_protocol         = "TLS1_2"
    no_table_scan                        = false
    oplog_size_mb                        = 2048
    sample_size_bi_connector             = 100
    sample_refresh_interval_bi_connector = 300
  }
}

# MongoDB Atlas Backup Policy
resource "mongodbatlas_cloud_backup_schedule" "backup_schedule" {
  project_id   = mongodbatlas_project.project.id
  cluster_name = mongodbatlas_cluster.cluster.name

  reference_hour_of_day    = 3
  reference_minute_of_hour = 0
  restore_window_days      = 7

  # Daily backup policy
  policy_item_daily {
    frequency_interval = 1
    retention_unit     = "days"
    retention_value    = 7
  }

  # Weekly backup policy
  policy_item_weekly {
    frequency_interval = 1
    retention_unit     = "weeks"
    retention_value    = 4
  }

  # Monthly backup policy
  policy_item_monthly {
    frequency_interval = 1
    retention_unit     = "months"
    retention_value    = 12
  }
}

# MongoDB Atlas Database User
resource "mongodbatlas_database_user" "app_user" {
  username           = "app-user"
  password           = var.mongodb_atlas_app_user_password
  project_id         = mongodbatlas_project.project.id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "english_conversation_db"
  }

  scopes {
    name = mongodbatlas_cluster.cluster.name
    type = "CLUSTER"
  }
}

# MongoDB Atlas IP Access List
resource "mongodbatlas_project_ip_access_list" "app_access" {
  project_id = mongodbatlas_project.project.id
  cidr_block = "0.0.0.0/0" # In production, restrict to your application's IP range
  comment    = "Allow access from application servers"
}

# Variables
variable "mongodb_atlas_app_user_password" {
  description = "MongoDB Atlas application user password"
  type        = string
  sensitive   = true
}

# Outputs
output "mongodb_connection_string" {
  description = "MongoDB Atlas connection string"
  value       = mongodbatlas_cluster.cluster.connection_strings[0].standard_srv
  sensitive   = true
}

output "mongodb_cluster_id" {
  description = "MongoDB Atlas cluster ID"
  value       = mongodbatlas_cluster.cluster.cluster_id
}