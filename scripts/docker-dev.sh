#!/bin/bash

# Docker Development Script for Glucose Monitor
# This script provides easy commands for managing the Docker development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    check_docker
    check_docker_compose
    
    # Set environment variable for Docker mode
    export REACT_APP_DOCKER=true
    
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_success "Development environment started!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:8080"
    print_status "Database: localhost:5432"
    print_status "Use 'docker-compose -f docker-compose.dev.yml logs -f' to view logs"
}

# Function to stop development environment
stop_dev() {
    print_status "Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Development environment stopped!"
}

# Function to restart development environment
restart_dev() {
    print_status "Restarting development environment..."
    stop_dev
    start_dev
}

# Function to view logs
logs() {
    print_status "Showing logs (Ctrl+C to exit)..."
    docker-compose -f docker-compose.dev.yml logs -f
}

# Function to rebuild containers
rebuild() {
    print_status "Rebuilding containers..."
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml build --no-cache
    start_dev
}

# Function to clean up everything
cleanup() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up Docker environment..."
        docker-compose -f docker-compose.dev.yml down -v --rmi all
        docker system prune -f
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to show status
status() {
    print_status "Container status:"
    docker-compose -f docker-compose.dev.yml ps
    
    echo ""
    print_status "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:8080"
    echo "  Database: localhost:5432"
}

# Function to show help
show_help() {
    echo "Docker Development Script for Glucose Monitor"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start development environment"
    echo "  stop      Stop development environment"
    echo "  restart   Restart development environment"
    echo "  logs      View logs from all services"
    echo "  rebuild   Rebuild all containers"
    echo "  cleanup   Remove all containers, volumes, and images"
    echo "  status    Show container status and URLs"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start      # Start the development environment"
    echo "  $0 logs       # View logs from all services"
    echo "  $0 stop       # Stop the development environment"
}

# Main script logic
case "${1:-help}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    logs)
        logs
        ;;
    rebuild)
        rebuild
        ;;
    cleanup)
        cleanup
        ;;
    status)
        status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
