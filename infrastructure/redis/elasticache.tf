provider "aws" {
  region = var.aws_region
}

# Variables
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  default     = "cache.t3.medium"
}

variable "redis_engine_version" {
  description = "ElastiCache Redis engine version"
  default     = "6.2"
}

variable "redis_parameter_group_name" {
  description = "ElastiCache Redis parameter group name"
  default     = "default.redis6.x"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the cluster"
  default     = 2
}

# Security Group for Redis
resource "aws_security_group" "redis_sg" {
  name        = "${var.app_name}-redis-sg-${var.environment}"
  description = "Security group for Redis ElastiCache"
  vpc_id      = aws_vpc.main.id

  # Redis port
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-redis-sg-${var.environment}"
    Environment = var.environment
  }
}

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name       = "${var.app_name}-redis-subnet-group-${var.environment}"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = {
    Name        = "${var.app_name}-redis-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# Redis Replication Group (Cluster Mode Disabled)
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id          = "${var.app_name}-redis-${var.environment}"
  replication_group_description = "Redis cluster for ${var.app_name}"
  node_type                     = var.redis_node_type
  port                          = 6379
  parameter_group_name          = var.redis_parameter_group_name
  engine_version                = var.redis_engine_version
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  subnet_group_name             = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids            = [aws_security_group.redis_sg.id]
  number_cache_clusters         = var.redis_num_cache_nodes
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true

  tags = {
    Name        = "${var.app_name}-redis-${var.environment}"
    Environment = var.environment
  }
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.app_name}-redis-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 120
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "Redis cluster CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis_cluster.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.app_name}-redis-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis cluster memory usage is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis_cluster.id
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.app_name}-alerts-${var.environment}"

  tags = {
    Name        = "${var.app_name}-alerts-${var.environment}"
    Environment = var.environment
  }
}

# SNS Topic Subscription
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Variables
variable "alert_email" {
  description = "Email address for alerts"
  type        = string
}

# Outputs
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
}