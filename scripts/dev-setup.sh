#!/bin/bash

echo "🐳 Starting PostgreSQL with Docker..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U dev -d slack_assistant; do
  sleep 2
done

echo "🔄 Running Prisma migrations..."
npx prisma migrate dev --name init

echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Development environment ready!"
echo "📊 Database: postgresql://dev:devpass@localhost:5432/slack_assistant"
echo "🔧 pgAdmin: http://localhost:8080 (admin@example.com / admin)"