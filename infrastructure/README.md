# English Conversation Management System - Infrastructure

This directory contains the infrastructure as code (IaC) configurations for deploying the English Conversation Management System to production.

## Infrastructure Components

The system is deployed on AWS with the following components:

1. **AWS EC2 with Auto Scaling**
   - EC2 instances for running the application backend
   - Auto-scaling groups for handling variable load
   - Application Load Balancer for distributing traffic

2. **MongoDB Atlas**
   - Production cluster with M10 instances
   - Automated backup policies (daily, weekly, monthly)
   - Network security configuration

3. **Redis ElastiCache**
   - High-availability Redis cluster
   - Automatic failover configuration
   - Encryption in transit and at rest

4. **AWS S3 with CloudFront CDN**
   - S3 bucket for storing audio files
   - CloudFront distribution for fast global content delivery
   - Lifecycle policies for cost optimization

5. **Monitoring and Alerting**
   - CloudWatch dashboards for system monitoring
   - Automated alerts for system issues
   - Log aggregation and analysis

6. **CI/CD Pipeline**
   - GitHub Actions workflow for automated deployment
   - Testing, building, and deployment stages
   - Post-deployment health checks

## Deployment Instructions

### Prerequisites

1. Install Terraform (version 1.0.0 or later)
2. Configure AWS CLI with appropriate credentials
3. MongoDB Atlas account with API keys
4. Domain name and SSL certificate

### Deployment Steps

1. **Initialize Terraform**

```bash
cd infrastructure
terraform init
```

2. **Configure Variables**

Create a `terraform.tfvars` file with the required variables:

```
# AWS Configuration
aws_region = "ap-northeast-2"
app_name = "english-conversation-management"
environment = "prod"
domain_name = "your-domain.com"
certificate_arn = "arn:aws:acm:region:account:certificate/certificate-id"
alert_email = "alerts@your-domain.com"

# MongoDB Atlas Configuration
mongodb_atlas_public_key = "your-atlas-public-key"
mongodb_atlas_private_key = "your-atlas-private-key"
mongodb_atlas_org_id = "your-atlas-org-id"
mongodb_atlas_app_user_password = "secure-password-for-app-user"
```

3. **Plan the Deployment**

```bash
terraform plan -out=tfplan
```

4. **Apply the Configuration**

```bash
terraform apply tfplan
```

5. **Configure DNS**

Update your DNS settings to point to the ALB and CloudFront distribution.

6. **Configure CI/CD**

Add the GitHub Actions workflow file to your repository and configure the required secrets.

## Monitoring and Maintenance

### Monitoring Dashboards

Access the CloudWatch dashboard at:
https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#dashboards:name=english-conversation-management-dashboard-prod

### Backup and Recovery

MongoDB Atlas backups are configured with the following schedule:
- Daily backups: Retained for 7 days
- Weekly backups: Retained for 4 weeks
- Monthly backups: Retained for 12 months

To restore from a backup, use the MongoDB Atlas console or API.

### Scaling

The system will automatically scale based on CPU utilization:
- Scale up: When CPU > 70% for 4 minutes
- Scale down: When CPU < 30% for 4 minutes

To modify scaling policies, update the `ec2-autoscaling.tf` file.

## Security Considerations

1. **Network Security**
   - All traffic is encrypted in transit using TLS
   - VPC security groups restrict access to necessary ports only
   - MongoDB Atlas access is restricted to application servers

2. **Data Security**
   - S3 data is encrypted at rest
   - Redis data is encrypted at rest and in transit
   - MongoDB Atlas data is encrypted at rest

3. **Access Control**
   - IAM roles with least privilege principle
   - MongoDB Atlas users with specific database permissions
   - No direct SSH access to production servers (use AWS Systems Manager)

## Cost Optimization

1. **Auto-scaling** ensures you only pay for the resources you need
2. **S3 Lifecycle Policies** automatically transition infrequently accessed data to cheaper storage
3. **CloudFront** reduces bandwidth costs and improves performance
4. **MongoDB Atlas M10** provides a good balance of performance and cost for production workloads

## Troubleshooting

### Common Issues

1. **Application not responding**
   - Check CloudWatch logs for errors
   - Verify EC2 instances are healthy in the Auto Scaling Group
   - Check ALB target group health

2. **High latency**
   - Check CloudWatch metrics for CPU and memory usage
   - Verify Redis cluster performance
   - Check MongoDB Atlas performance metrics

3. **Deployment failures**
   - Check GitHub Actions logs for errors
   - Verify AWS credentials are valid
   - Check for resource constraints or service quotas

For additional support, contact the system administrator.