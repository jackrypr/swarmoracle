#!/bin/bash

# SwarmOracle Production Migration Script
# This script handles database migrations for production deployments

set -e  # Exit on any error

echo "🚀 SwarmOracle Production Migration Script"
echo "=========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set your production database URL:"
    echo "export DATABASE_URL='postgresql://user:password@host:port/dbname'"
    exit 1
fi

# Parse DATABASE_URL to extract components for validation
DB_URL_REGEX="^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    echo "📋 Database Connection Details:"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
else
    echo "⚠️  WARNING: Could not parse DATABASE_URL format"
fi

echo ""

# Function to check if database is accessible
check_database() {
    echo "🔍 Checking database connectivity..."
    
    # Try to connect and run a simple query
    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection successful"
        return 0
    else
        echo "❌ Database connection failed"
        return 1
    fi
}

# Function to backup database (if supported)
backup_database() {
    echo "💾 Creating database backup..."
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if command -v pg_dump > /dev/null 2>&1; then
        echo "   Using pg_dump for backup..."
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || {
            echo "⚠️  WARNING: Backup failed, but continuing with migration"
            echo "   You may want to create a manual backup"
            return 1
        }
        echo "✅ Backup created: $BACKUP_FILE"
    else
        echo "⚠️  WARNING: pg_dump not available, skipping backup"
        echo "   Consider creating a manual backup before proceeding"
        return 1
    fi
}

# Function to check migration status
check_migration_status() {
    echo "📊 Checking current migration status..."
    
    npx prisma migrate status || {
        echo "❌ Could not determine migration status"
        return 1
    }
}

# Function to deploy migrations
deploy_migrations() {
    echo "🚀 Deploying migrations..."
    
    # Deploy pending migrations
    npx prisma migrate deploy || {
        echo "❌ Migration deployment failed!"
        echo ""
        echo "🔧 Troubleshooting steps:"
        echo "1. Check database permissions"
        echo "2. Verify schema compatibility"
        echo "3. Review migration files in prisma/migrations/"
        echo "4. Consider manual intervention if needed"
        return 1
    }
    
    echo "✅ Migrations deployed successfully"
}

# Function to generate Prisma client
generate_client() {
    echo "⚙️  Generating Prisma client..."
    
    npx prisma generate || {
        echo "❌ Prisma client generation failed"
        return 1
    }
    
    echo "✅ Prisma client generated successfully"
}

# Function to validate deployment
validate_deployment() {
    echo "🔍 Validating deployment..."
    
    # Check if all tables exist
    EXPECTED_TABLES=("agents" "agent_stats" "questions" "answers" "stakes" "debate_rounds" "critiques" "consensus_logs" "consensus_weights")
    
    for table in "${EXPECTED_TABLES[@]}"; do
        if npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM $table LIMIT 1;" > /dev/null 2>&1; then
            echo "   ✅ Table '$table' exists and accessible"
        else
            echo "   ❌ Table '$table' missing or inaccessible"
            return 1
        fi
    done
    
    echo "✅ All expected tables validated"
}

# Main execution flow
main() {
    echo "Starting migration process..."
    echo ""
    
    # Step 1: Check database connectivity
    if ! check_database; then
        echo ""
        echo "🛑 Cannot proceed without database access"
        echo "Please check your DATABASE_URL and network connectivity"
        exit 1
    fi
    
    echo ""
    
    # Step 2: Show current migration status
    check_migration_status
    echo ""
    
    # Step 3: Ask for confirmation in interactive mode
    if [ -t 0 ] && [ -t 1 ]; then  # Check if running interactively
        read -p "🤔 Do you want to proceed with the migration? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Migration cancelled by user"
            exit 0
        fi
        echo ""
    fi
    
    # Step 4: Attempt backup (optional, continues on failure)
    backup_database || echo "Continuing without backup..."
    echo ""
    
    # Step 5: Deploy migrations
    if ! deploy_migrations; then
        echo ""
        echo "🛑 Migration deployment failed!"
        exit 1
    fi
    
    echo ""
    
    # Step 6: Generate Prisma client
    if ! generate_client; then
        echo ""
        echo "🛑 Client generation failed!"
        exit 1
    fi
    
    echo ""
    
    # Step 7: Validate deployment
    if ! validate_deployment; then
        echo ""
        echo "⚠️  WARNING: Validation failed, but migration may still be functional"
        echo "Please manually verify your database structure"
    fi
    
    echo ""
    echo "🎉 Production migration completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test your application with the new schema"
    echo "2. Monitor logs for any issues"
    echo "3. Consider running seed data if this is a fresh deployment"
    echo ""
    echo "💡 To seed the database with sample data:"
    echo "   npm run db:seed"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "SwarmOracle Production Migration Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --dry-run      Show what would be done without executing"
        echo "  --force        Skip confirmation prompts"
        echo ""
        echo "Environment Variables:"
        echo "  DATABASE_URL   PostgreSQL connection string (required)"
        echo ""
        exit 0
        ;;
    --dry-run)
        echo "🧪 DRY RUN MODE - No changes will be made"
        echo ""
        check_database
        echo ""
        check_migration_status
        echo ""
        echo "Migration would proceed from here..."
        exit 0
        ;;
    --force)
        echo "⚡ FORCE MODE - Skipping confirmation prompts"
        main
        ;;
    "")
        main
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac