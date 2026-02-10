package main

import (
	"fmt"
	"os"
	"time"

	"github.com/trackeep/backend/services"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run favicon_test.go <URL>")
		fmt.Println("Example: go run favicon_test.go https://github.com")
		os.Exit(1)
	}

	url := os.Args[1]
	fmt.Printf("Testing favicon fetching for: %s\n\n", url)

	// Test the enhanced favicon fetcher
	fetcher := services.NewFaviconFetcher()

	fmt.Println("=== Enhanced Favicon Fetcher ===")
	start := time.Now()
	favicon, err := fetcher.FetchFavicon(url)
	duration := time.Since(start)

	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
	} else if favicon == "" {
		fmt.Printf("❌ No favicon found\n")
	} else {
		fmt.Printf("✅ Favicon found: %s (took %v)\n", favicon, duration)
	}

	fmt.Println("\n=== Multiple Favicon Candidates ===")
	start = time.Now()
	favicons := fetcher.FetchMultipleFavicons(url, 5)
	duration = time.Since(start)

	fmt.Printf("Found %d favicon candidates (took %v):\n", len(favicons), duration)
	for i, f := range favicons {
		fmt.Printf("  %d. %s\n", i+1, f)
	}

	fmt.Println("\n=== Original Metadata Service ===")
	start = time.Now()
	metadata, err := services.FetchWebsiteMetadata(url)
	duration = time.Since(start)

	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
	} else {
		fmt.Printf("✅ Metadata fetched (took %v):\n", duration)
		fmt.Printf("  Title: %s\n", metadata.Title)
		fmt.Printf("  Description: %s\n", metadata.Description)
		fmt.Printf("  Favicon: %s\n", metadata.Favicon)
		fmt.Printf("  Site Name: %s\n", metadata.SiteName)
	}

	fmt.Println("\n=== Comparison ===")
	if favicon != "" && metadata != nil && metadata.Favicon != "" {
		if favicon == metadata.Favicon {
			fmt.Println("✅ Both methods returned the same favicon")
		} else {
			fmt.Println("⚠️  Different favicons returned:")
			fmt.Printf("  Enhanced: %s\n", favicon)
			fmt.Printf("  Original: %s\n", metadata.Favicon)
		}
	} else if metadata == nil {
		fmt.Println("⚠️  Original metadata service failed, enhanced method succeeded")
	} else {
		fmt.Println("⚠️  Could not compare favicon results")
	}
}
