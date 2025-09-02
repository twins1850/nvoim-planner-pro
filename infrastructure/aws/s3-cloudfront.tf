# S3 Bucket for audio files
resource "aws_s3_bucket" "audio_files" {
  bucket = "${var.app_name}-audio-files-${var.environment}"

  tags = {
    Name        = "${var.app_name}-audio-files-${var.environment}"
    Environment = var.environment
  }
}

# S3 Bucket ACL
resource "aws_s3_bucket_ownership_controls" "audio_files" {
  bucket = aws_s3_bucket.audio_files.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "audio_files" {
  depends_on = [aws_s3_bucket_ownership_controls.audio_files]
  bucket     = aws_s3_bucket.audio_files.id
  acl        = "private"
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "audio_files" {
  bucket = aws_s3_bucket.audio_files.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "audio_files" {
  bucket = aws_s3_bucket.audio_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "audio_files" {
  bucket = aws_s3_bucket.audio_files.id

  rule {
    id     = "original-files-cleanup"
    status = "Enabled"

    filter {
      prefix = "original/"
    }

    expiration {
      days = 7
    }
  }

  rule {
    id     = "processed-files-transition"
    status = "Enabled"

    filter {
      prefix = "processed/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "audio_files" {
  comment = "OAI for ${var.app_name} audio files"
}

# S3 Bucket policy for CloudFront access
resource "aws_s3_bucket_policy" "audio_files" {
  bucket = aws_s3_bucket.audio_files.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = {
          AWS = "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${aws_cloudfront_origin_access_identity.audio_files.id}"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.audio_files.arn}/*"
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "audio_files" {
  origin {
    domain_name = aws_s3_bucket.audio_files.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.audio_files.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.audio_files.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_200" # Use only North America, Europe, Asia, Middle East, and Africa

  aliases = ["audio.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${aws_s3_bucket.audio_files.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.app_name}-cf-${var.environment}"
    Environment = var.environment
  }
}

# Variables
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "example.com" # Replace with your actual domain
}

# Outputs
output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.audio_files.domain_name
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for audio files"
  value       = aws_s3_bucket.audio_files.bucket
}