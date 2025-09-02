# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.app_name}-dashboard-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", aws_autoscaling_group.app.name]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EC2 CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "ReplicationGroupId", aws_elasticache_replication_group.redis_cluster.id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.audio_files.bucket, "StorageType", "StandardStorage"]
          ]
          period = 86400
          stat   = "Average"
          region = var.aws_region
          title  = "S3 Bucket Size"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.app.arn_suffix]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "ALB Request Count"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.app.arn_suffix]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ALB Response Time"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.audio_files.id]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1" # CloudFront metrics are in us-east-1
          title  = "CloudFront Requests"
        }
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/ec2/${var.app_name}-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "${var.app_name}-logs-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/api/${var.app_name}-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "${var.app_name}-api-logs-${var.environment}"
    Environment = var.environment
  }
}

# CloudWatch Alarms for API
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.app_name}-api-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This alarm monitors for 5XX errors from the API"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  alarm_name          = "${var.app_name}-api-4xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_4XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "This alarm monitors for excessive 4XX errors from the API"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.app_name}-api-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1 # 1 second
  alarm_description   = "This alarm monitors for high API latency"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }
}

# CloudWatch Alarms for S3
resource "aws_cloudwatch_metric_alarm" "s3_4xx_errors" {
  alarm_name          = "${var.app_name}-s3-4xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4xxErrors"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "This alarm monitors for excessive 4XX errors from S3"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    BucketName = aws_s3_bucket.audio_files.bucket
  }
}

# CloudWatch Composite Alarm for System Health
resource "aws_cloudwatch_composite_alarm" "system_health" {
  alarm_name        = "${var.app_name}-system-health-${var.environment}"
  alarm_description = "Composite alarm that triggers when multiple components have issues"
  
  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.high_cpu.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.redis_cpu.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.api_5xx_errors.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.api_latency.alarm_name})"
  ])
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch Logs Metric Filter for Error Tracking
resource "aws_cloudwatch_log_metric_filter" "error_logs" {
  name           = "${var.app_name}-error-logs-${var.environment}"
  pattern        = "ERROR"
  log_group_name = aws_cloudwatch_log_group.app_logs.name

  metric_transformation {
    name      = "ErrorCount"
    namespace = "${var.app_name}/${var.environment}"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_logs_alarm" {
  alarm_name          = "${var.app_name}-error-logs-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorCount"
  namespace           = "${var.app_name}/${var.environment}"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "This alarm monitors for excessive error logs"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# CloudWatch Logs Insights Queries
locals {
  cloudwatch_insights_queries = {
    api_errors = {
      name  = "API Errors"
      query = "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 100"
    }
    slow_api_calls = {
      name  = "Slow API Calls"
      query = "fields @timestamp, @message | filter @message like /Request completed in/ | parse @message /Request completed in * ms/ as duration | filter duration > 1000 | sort duration desc | limit 100"
    }
    auth_failures = {
      name  = "Authentication Failures"
      query = "fields @timestamp, @message | filter @message like /Authentication failed/ | sort @timestamp desc | limit 100"
    }
  }
}

# CloudWatch Logs Insights Saved Queries
resource "aws_cloudwatch_query_definition" "insights_queries" {
  for_each = local.cloudwatch_insights_queries

  name  = "${var.app_name}-${each.key}-${var.environment}"
  query = each.value.query

  log_group_names = [
    aws_cloudwatch_log_group.app_logs.name,
    aws_cloudwatch_log_group.api_logs.name
  ]
}