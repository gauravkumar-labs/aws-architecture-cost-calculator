# AWS Cost & Architecture Estimator

An interactive dark-mode cloud architecture and monthly cost modeling workstation for **.NET 8/9** workloads on AWS. Compare **Serverless AWS Lambda** against **Containerized Amazon EKS** (with an optional **Amazon ECS / AWS Fargate** benchmark) alongside **Amazon RDS** (PostgreSQL / SQL Server Multi-AZ + Read Replicas), **Amazon SQS**, **Application Load Balancer (ALB)**, and **NAT Gateway data egress**.

## Key Features

- **.NET 8/9 Workload Presets**
  - **Spiky Lead-Processing Webhook API**: .NET 8 Native AOT Minimal API with 8x traffic bursts, SQS buffering, and Single-AZ PostgreSQL.
  - **Steady High-Throughput B2B Microservice**: .NET 9 ASP.NET Core Kestrel + EF Core at 180 sustained RPS with Multi-AZ PostgreSQL + 1 read replica.
  - **Enterprise Monolith Migration**: .NET 8 Modular Monolith with 2 GB memory footprint, 240 ms p95 latency, FIFO SQS, and Multi-AZ SQL Server + 1 read replica.
- **Interactive Sizing Controls**
  - **Regions & Compilation**: `us-east-1`, `us-west-2`, `eu-west-1`, `ap-southeast-1`, plus `.NET Native AOT` vs. `Kestrel JIT` execution assumptions.
  - **Traffic & Compute**: Baseline RPS, peak burst multiplier, peak hours/day, p95 duration, memory allocation (256 MB–2 GB), container vCPU/pod, and Lambda Provisioned Concurrency.
  - **EKS & Fargate Options**: `Spot + Graviton3`, `Graviton3 On-Demand`, and `x86_64 On-Demand` node pools, `$73/mo` EKS control plane toggle, and an optional ECS/Fargate comparison with configurable Spot percentage.
  - **Persistence & Networking**: RDS engine (`PostgreSQL 16` / `SQL Server Standard`), instance tier, Multi-AZ synchronous standby, 0–3 read replicas, GP3 storage, SQS Standard/FIFO volume, and 1–2 AZ NAT Gateways + internet egress GB.
- **Side-by-Side Cost Breakdown & Break-Even RPS Curve**
  - Itemized monthly and annualized run-rates across Compute, Control Plane, ALB (+ LCU), RDS, SQS, and NAT Egress with stacked spend composition bars.
  - Interactive SVG Break-Even Chart sweeping baseline RPS to highlight the exact crossover point where EKS (or Fargate) becomes cheaper than Lambda.
- **Operational & Portability Trade-Offs**
  - Matrix comparing Kubernetes multi-cloud/on-prem portability, patching overhead, .NET cold-start vs. warm JIT characteristics, RDS connection pooling, and FinOps cost predictability.
- **Exportable Infrastructure Artifacts**
  - Live-generated **`terraform.tfvars`** baseline and **Markdown Architecture Decision Record (`ADR-001-aws-dotnet-architecture.md`)** with one-click Copy and Download actions.

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 (`Plus Jakarta Sans` + `JetBrains Mono` tabular numerals)
- **Icons**: `lucide-react`

## Local Development

```bash
# Install dependencies
npm install

# Start the development server on port 3000
npm run dev

# Type-check and build for production
npm run lint
npm run build
```

## Deploying to Vercel

This repository includes a `vercel.json` configured for a static Vite build (`dist/`):

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Import the repository in the Vercel dashboard.
3. Vercel automatically detects `vite` (`npm run build`, output directory `dist`)—click **Deploy**.

## Pricing Model Notes

- Estimates use AWS public on-demand and representative Spot unit rates across a standard `730 hours/month` (`2,592,000 seconds/month`) billing window.
- EKS node counts account for ~15% kubelet/DaemonSet overhead and a 2-node multi-AZ minimum floor (keeping 1 On-Demand system node when using `Spot + Graviton3`).
- Validate final Savings Plans, Reserved Instance terms, and Enterprise Discount Program (EDP) pricing in the official AWS Pricing Calculator prior to procurement.
