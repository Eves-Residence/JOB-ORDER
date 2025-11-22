const sheetURL = "https://script.google.com/macros/s/AKfycbw-nMYpLS2Rcx8WCVpijJMfW_HmPOxCPhnEaa-DPXqxMwZ_Pl8Qy8iGdz_KHZGR9Nu-/exec";

let allJobOrders = [];
const jobOrderList = document.getElementById("taskList");
const filterContainer = document.getElementById("filterContainer");

// 1a. Create Main Unified Filter Dropdown
const mainFilter = document.createElement("select");
mainFilter.id = "mainFilter";
mainFilter.style.padding = "8px";
mainFilter.style.borderRadius = "8px";
mainFilter.style.border = "1px solid #ccc";
mainFilter.style.fontWeight = "600";

mainFilter.innerHTML = `
  <option value="all">Show All Tasks</option>
  
  <optgroup label="Status">
    <option value="STATUS:Not Started">Status: Pending</option>
    <option value="STATUS:In Progress">Status: Ongoing</option>
    <option value="STATUS:Completed">Status: Completed</option>
    <option value="STATUS:Cancelled">Status: Cancelled</option>
  </optgroup>
  
  <optgroup label="Priority">
    <option value="PRIORITY:High">Priority: High</option>
    <option value="PRIORITY:Medium">Priority: Medium</option>
    <option value="PRIORITY:Low">Priority: Low</option>
  </optgroup>

  <optgroup label="Property">
    <option value="PROPERTY:ECO 1">Property: ECO 1</option>
    <option value="PROPERTY:ECO 2">Property: ECO 2</option>
    <option value="PROPERTY:GREEN">Property: GREEN</option>
    <option value="PROPERTY:HOMEY">Property: HOMEY</option>
    <option value="PROPERTY:ADI 168">Property: ADI 168</option>
    <option value="PROPERTY:KALAYAAN">Property: KALAYAAN</option>
    <option value="PROPERTY:PLEASANT">Property: PLEASANT</option>
    <option value="PROPERTY:DREAM">Property: DREAM</option>
    <option value="PROPERTY:PENTHAUZ">Property: PENTHAUZ</option>
    <option value="PROPERTY:BED AND BATH">Property: BED AND BATH</option>
  </optgroup>
`;

// 1b. Create Search Input
const searchInput = document.createElement("input");
searchInput.type = "text";
searchInput.placeholder = "Search JO #...";
searchInput.style.padding = "8px";
searchInput.style.borderRadius = "8px";
searchInput.style.border = "1px solid #ccc";
searchInput.style.marginLeft = "10px"; 
searchInput.style.width = "140px"; 

// Inject Controls on Load
document.addEventListener("DOMContentLoaded", () => {
  if(filterContainer) {
    filterContainer.innerHTML = ""; 
    // Ensure container aligns items horizontally
    filterContainer.style.display = "flex";
    filterContainer.style.alignItems = "center";
    
    filterContainer.appendChild(mainFilter);
    filterContainer.appendChild(searchInput);
  }
  fetchJobOrders();
});

// 2. Parse TSV Data
function parseTSV(tsv) {
  const lines = tsv.trim().split("\n");
  const headers = lines.shift().split("\t").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split("\t");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").trim();
    });
    return obj;
  });
}

// 3. Fetch Data
async function fetchJobOrders() {
  try {
    const res = await fetch(sheetURL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tsvText = await res.text();
    allJobOrders = parseTSV(tsvText);
    renderJobOrders();
  } catch (err) {
    console.error(err);
    if(jobOrderList) jobOrderList.innerHTML = "<p style='text-align:center; color:black; font-weight:bold;'>Error connecting to database.</p>";
  }
}

// 4. Render Cards
function renderJobOrders() {
  if (!jobOrderList) return;

  if (!allJobOrders.length) {
    jobOrderList.innerHTML = "<p style='text-align:center; color:black;'>No job orders found.</p>";
    return;
  }

  // Calculate Next JO Number
  let lastJO = "25-0000";
  allJobOrders.forEach(job => {
     if(job["JOB ORDER NUMBER"]) lastJO = job["JOB ORDER NUMBER"];
  });
  const parts = lastJO.split("-");
  const nextJO = "25-" + (parseInt(parts[1], 10) + 1).toString().padStart(4, "0");

  // --- COMBINED FILTER LOGIC ---
  const filterValue = mainFilter.value; 
  const searchValue = searchInput.value.trim().toLowerCase();
  
  const filtered = allJobOrders.filter(t => {
      // 1. Check Dropdown
      let matchesCategory = true;
      if (filterValue !== "all") {
          const [category, val] = filterValue.split(":");
          matchesCategory = (t[category] || "").toUpperCase() === val.toUpperCase();
      }

      // 2. Check Search (Search by Job Order Number)
      let matchesSearch = true;
      if (searchValue) {
          const joNum = (t["JOB ORDER NUMBER"] || "").toLowerCase();
          matchesSearch = joNum.includes(searchValue);
      }

      return matchesCategory && matchesSearch;
  });

  jobOrderList.innerHTML = "";

  // Display Next JO at top
  const nextDiv = document.createElement("div");
  nextDiv.style.padding = "10px";
  nextDiv.style.textAlign = "right";
  nextDiv.style.fontSize = "12px";
  nextDiv.style.color = "#000"; 
  nextDiv.style.fontWeight = "bold";
  nextDiv.textContent = `Next System JO: ${nextJO}`;
  jobOrderList.appendChild(nextDiv);

  if (filtered.length === 0) {
      jobOrderList.innerHTML += "<p style='text-align:center; padding:20px;'>No tasks match your search/filter.</p>";
      return;
  }

  // Loop and Create Cards
  filtered.forEach(t => {
    const div = document.createElement("div");
    div.classList.add("task-card");

    // Logic for visual classes (borders)
    const priority = (t["PRIORITY"] || "low").toLowerCase();
    div.classList.add(priority); 

    const status = (t["STATUS"] || "").toLowerCase();
    let statusClass = "";
    if(status === "completed") statusClass = "status-completed";
    else if(status === "in progress") statusClass = "status-progress";

    // HEADER: JO# + Property + Unit + Tenant
    const headerTitle = `JO #${t["JOB ORDER NUMBER"]} | ${t["PROPERTY"] || "N/A"} | ${t["UNIT NUMBER"]} | ${t["TENANTS NAME"]}`;
    
    // BODY: The rest of the form details
    div.innerHTML = `
      <h3 class="card-title">${headerTitle}</h3>
      
      <div class="meta-info" style="border-top: 1px solid #eee; padding-top: 10px; margin-top: 10px;">
        <div style="margin-bottom: 8px;">
            <strong>Status:</strong> 
            <select class="status-dropdown ${statusClass}" onchange="updateStatus('${t["JOB ORDER NUMBER"]}', this.value)">
                <option value="Not Started" ${t["STATUS"] === "Not Started" ? "selected" : ""}>Pending</option>
                <option value="In Progress" ${t["STATUS"] === "In Progress" ? "selected" : ""}>Ongoing</option>
                <option value="Completed" ${t["STATUS"] === "Completed" ? "selected" : ""}>Completed</option>
                <option value="Cancelled" ${t["STATUS"] === "Cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
        </div>

        <p><strong>Request Date:</strong> ${t["REQUEST DATE"]}</p>
        <p><strong>Contact:</strong> ${t["CONTACT NUMER"]}</p>
        <p><strong>Priority:</strong> ${t["PRIORITY"] || "Normal"}</p>
        
        <hr style="margin: 10px 0; border: 0; border-top: 1px dashed #ccc;">

        <p><strong>Description:</strong> ${t["REPAIR DESCRIPTION"] || "No Description"}</p>
        <p><strong>Assessment:</strong> ${t["ASSESSMENT DATE"]} ${t["ASSESSMENT TIME"]}</p>
        <p><strong>Repair:</strong> ${t["REPAIR DATE"]} ${t["REPAIR TIME"]}</p>
        <p><strong>Materials:</strong> ${t["MATERIALS"] || "None"}</p>
        <p><strong>Date Completed:</strong> ${t["DATE COMPLETED"] || "None"}</p>
        
        <div style="margin-top: 15px; font-size: 11px; background: #f9f9f9; padding: 8px; border-radius: 5px;">
             <strong>Signatures:</strong><br>
             Tenant: ${t["TENANT'S SIGNITURE"] || "Pending"} <br>
             Property Rep: ${t["PROPERTY REPRESENTATIVE SIGNITURE"] || "Pending"} <br>
             Maintenance: ${t["MAINTENANCE SIGNITURE"] || "Pending"}
        </div>
      </div>
    `;

    jobOrderList.appendChild(div);
  });
}

// Listeners
mainFilter.addEventListener("change", renderJobOrders);
searchInput.addEventListener("input", renderJobOrders); // Trigger on typing

// Auto refresh every 30s
setInterval(fetchJobOrders, 30000);

// Function to Send Update to Google Sheet
function updateStatus(joNumber, newStatus) {
    const payload = { 
        joNumber: joNumber, 
        status: newStatus 
    };

    // If status is "Completed", add current date
    if (newStatus === "Completed") {
        const today = new Date();
        payload.dateCompleted = today.toLocaleDateString(); 
    }

    fetch(sheetURL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.result === "success") {
            // Optionally show a success toast
            // console.log("Update successful");
        } else {
            alert("Failed to update status: " + (data.message || "Unknown error"));
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Network error updating status.");
    });
}