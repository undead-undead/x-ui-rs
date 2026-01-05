use std::collections::HashMap;

fn main() {
    let json_output = r#"{
    "stat": [
        {
            "name": "outbound>>>blocked>>>traffic>>>downlink"
        },
        {
            "name": "inbound>>>api>>>traffic>>>uplink",
            "value": 4832
        },
        {
            "name": "inbound>>>api>>>traffic>>>downlink",
            "value": 8903
        },
        {
            "name": "inbound>>>inbound-2a80a671>>>traffic>>>uplink",
            "value": 362637
        }
    ]
}"#;

    let mut stats = HashMap::new();
    let mut current_name: Option<String> = None;
    let mut current_value: Option<i64> = None;

    for line in json_output.lines() {
        let line = line.trim();

        println!("Processing line: '{}'", line);

        // Reset state on object END only
        if line.starts_with("}") {
            println!(
                "  → Found boundary, name={:?}, value={:?}",
                current_name, current_value
            );
            if let (Some(name), Some(value)) = (&current_name, current_value) {
                println!("  → Inserting: {} = {}", name, value);
                stats.insert(name.clone(), value);
            }
            current_name = None;
            current_value = None;
        }

        // Extract name
        if line.contains("name") {
            if let Some(part) = line.split("name").nth(1) {
                if let Some(start) = part.find('"') {
                    if let Some(end) = part[start + 1..].find('"') {
                        let extracted = part[start + 1..start + 1 + end].to_string();
                        println!("  → Extracted name: {}", extracted);
                        current_name = Some(extracted);
                    }
                }
            }
        }

        // Extract value
        if line.contains("value") {
            if let Some(part) = line.split("value").nth(1) {
                let num_str: String = part.chars().filter(|c| c.is_ascii_digit()).collect();
                if let Ok(value) = num_str.parse::<i64>() {
                    println!("  → Extracted value: {}", value);
                    current_value = Some(value);
                }
            }
        }
    }

    println!("\n=== Final Results ===");
    println!("Total entries: {}", stats.len());
    for (key, val) in &stats {
        println!("  {} = {}", key, val);
    }
}
