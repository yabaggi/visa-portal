const SS_ID = "1rQki41Hkx-W1ydL3u9K17LpqjeCNB09vVTwRqsmQ2cQ";


function doGet(e) {
  var page = e && e.parameter && e.parameter.page ? e.parameter.page : "landing";
  
  if (page === "admin") {
    return HtmlService.createHtmlOutputFromFile("AdminPortal")
      .setTitle("Visa Admin Portal")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
  }
  
  if (page === "portal") {
    return HtmlService.createHtmlOutputFromFile("VisaPortal")
      .setTitle("Visa Request Portal")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
  }
  
  // Default: Landing page
  return HtmlService.createHtmlOutputFromFile("LandingPage")
    .setTitle("Visa Portal")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
}


function initializeSheets() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var appSheet = ss.getSheetByName("Applications");
  if (!appSheet) {
    appSheet = ss.insertSheet("Applications");
    appSheet.appendRow([
      "ApplicationID", "SubmissionDate", "Status",
      "Surname", "FirstName", "DateOfBirth", "PlaceOfBirth",
      "Nationality", "Gender", "MaritalStatus",
      "PassportNumber", "IssuingCountry", "DateOfIssue", "ExpirationDate",
      "HomeAddress", "Email", "Telephone",
      "PurposeOfTravel", "ArrivalDate", "DepartureDate", "Destination",
      "ParentSpouseName", "SponsorContact", "HotelInfo",
      "PhotoURL", "AdminNotes"
    ]);
    appSheet.getRange(1, 1, 1, 26).setFontWeight("bold");
  }
  var settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
    settingsSheet.appendRow(["FieldID", "Visible", "Required"]);
    settingsSheet.getRange(1, 1, 1, 3).setFontWeight("bold");
    var defaults = getDefaultFieldConfig();
    for (var i = 0; i < defaults.length; i++) {
      settingsSheet.appendRow([defaults[i].id, defaults[i].visible ? "TRUE" : "FALSE", defaults[i].required ? "TRUE" : "FALSE"]);
    }
  }
  return "Sheets initialized.";
}

function getDefaultFieldConfig() {
  return [
    {id:"surname",visible:true,required:true},{id:"firstName",visible:true,required:true},
    {id:"dateOfBirth",visible:true,required:true},{id:"placeOfBirth",visible:true,required:true},
    {id:"nationality",visible:true,required:true},{id:"gender",visible:true,required:true},
    {id:"maritalStatus",visible:true,required:true},{id:"passportNumber",visible:true,required:true},
    {id:"issuingCountry",visible:true,required:true},{id:"dateOfIssue",visible:true,required:true},
    {id:"expirationDate",visible:true,required:true},{id:"homeAddress",visible:true,required:true},
    {id:"email",visible:true,required:true},{id:"telephone",visible:true,required:true},
    {id:"purposeOfTravel",visible:true,required:true},{id:"arrivalDate",visible:true,required:true},
    {id:"departureDate",visible:true,required:true},{id:"destination",visible:true,required:true},
    {id:"parentSpouseName",visible:true,required:false},{id:"sponsorContact",visible:true,required:false},
    {id:"hotelInfo",visible:true,required:false},{id:"photo",visible:true,required:false}
  ];
}


function getFieldSettings() {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName("FieldSettings");
    if (!sheet || sheet.getLastRow() < 2) return getDefaultFieldConfig();
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      result.push({ id: data[i][0], visible: data[i][1] === "TRUE", required: data[i][2] === "TRUE" });
    }
    return result;
  } catch (e) {
    return getDefaultFieldConfig();
  }
}


function saveFieldSettings(settings) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName("FieldSettings");
    if (!sheet) {
      sheet = ss.insertSheet("FieldSettings");
      sheet.appendRow(["FieldID", "Visible", "Required"]);
      sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
    }
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
    for (var i = 0; i < settings.length; i++) {
      sheet.getRange(i + 2, 1, 1, 3).setValues([[settings[i].id, settings[i].visible ? "TRUE" : "FALSE", settings[i].required ? "TRUE" : "FALSE"]]);
    }
    return {success: true};
  } catch (e) {
    return {success: false, error: e.toString()};
  }
}


function generateAppId() {
  return "VIS-" + new Date().getFullYear() + "-" + Math.random().toString(36).substr(2, 8).toUpperCase();
}

function getOrCreatePhotoFolder() {
  var ssFile = DriveApp.getFileById(SS_ID);
  var parentFolder = ssFile.getParents().next();
  var folderName = "Visa_Photos";
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function uploadPhotoToDrive(base64Data, fileName) {
  try {
    if (!base64Data || base64Data.length < 50) {
      return {success: false, error: "No photo data received"};
    }

    var photoFolder = getOrCreatePhotoFolder();

    // Parse base64 — handle both "data:image/...;base64,XXXX" and raw base64
    var contentType = "image/jpeg";
    var rawBase64 = base64Data;

    if (base64Data.indexOf("data:") === 0) {
      var matchType = base64Data.match(/data:(.*?);base64,/);
      if (matchType) contentType = matchType[1];
      rawBase64 = base64Data.split(",")[1];
    }

    if (!rawBase64 || rawBase64.length < 10) {
      return {success: false, error: "Invalid base64 data"};
    }

    var decoded = Utilities.base64Decode(rawBase64);
    var blob = Utilities.newBlob(decoded, contentType, fileName);

    var file = photoFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();

    Logger.log("Photo uploaded: " + fileId + " size: " + decoded.length);

    return {
      success: true,
      fileId: fileId,
      viewUrl: "https://drive.google.com/uc?id=" + fileId,
      thumbUrl: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w300"
    };
  } catch (e) {
    Logger.log("uploadPhotoToDrive error: " + e.toString());
    return {success: false, error: e.toString()};
  }
}



// ============ LANDING PAGE SETTINGS ============

function getLandingSettings() {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName("Settings");
  
  if (!sheet) {
    sheet = ss.insertSheet("Settings");
    // Set default values
    var defaults = [
      ["key", "value"],
      ["orgName", "Republic of Veridian"],
      ["tagline", "Electronic Visa Application System"],
      ["heroImageUrl", ""],
      ["adminPassword", "admin123"],
      ["primaryColor", "#1e40af"],
      ["accentColor", "#3b82f6"],
      ["footerText", "© 2026 Republic of Veridian — Immigration & Border Control"],
      ["portalButtonText", "Apply for Visa"],
      ["adminButtonText", "Admin Portal"],
      ["heroTitle", "Welcome to the Official Visa Portal"],
      ["heroSubtitle", "Fast, secure, and transparent visa processing for travelers worldwide"],
      ["announcementText", ""],
      ["logoUrl", ""]
    ];
    sheet.getRange(1, 1, defaults.length, 2).setValues(defaults);
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 500);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e2e8f0");
  }
  
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      settings[data[i][0]] = data[i][1] || "";
    }
  }
  
  return settings;
}

function saveLandingSettings(settings) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName("Settings");
  
  if (!sheet) {
    getLandingSettings(); // Creates sheet with defaults
    sheet = ss.getSheetByName("Settings");
  }
  
  var data = sheet.getDataRange().getValues();
  
  for (var key in settings) {
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(settings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, settings[key]]);
    }
  }
  
  return {success: true};
}

function verifyAdminPassword(password) {
  var settings = getLandingSettings();
  return password === (settings.adminPassword || "admin123");
}


function submitApplication(data) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var appSheet = ss.getSheetByName("Applications");
    if (!appSheet) {
      initializeSheets();
      appSheet = ss.getSheetByName("Applications");
    }

    var appId = generateAppId();
    var submissionDate = new Date().toISOString();

    // Photo: check for Drive file ID first, then base64 fallback
    var photoValue = "";
    if (data.photoFileId && data.photoFileId.length > 5) {
      photoValue = "DRIVE:" + data.photoFileId;
      Logger.log("Saving photo as DRIVE ref: " + photoValue);
    } else if (data.photoBase64 && data.photoBase64.length > 50) {
      // Fallback: upload base64 directly from submit
      var uploadResult = uploadPhotoToDrive(data.photoBase64, "visa_" + appId + ".jpg");
      if (uploadResult.success) {
        photoValue = "DRIVE:" + uploadResult.fileId;
        Logger.log("Uploaded photo on submit: " + photoValue);
      } else {
        Logger.log("Photo upload failed on submit: " + uploadResult.error);
      }
    }

    appSheet.appendRow([
      appId, submissionDate, "Pending",
      data.surname || "", data.firstName || "", data.dateOfBirth || "", data.placeOfBirth || "",
      data.nationality || "", data.gender || "", data.maritalStatus || "",
      data.passportNumber || "", data.issuingCountry || "", data.dateOfIssue || "", data.expirationDate || "",
      data.homeAddress || "", data.email || "", data.telephone || "",
      data.purposeOfTravel || "", data.arrivalDate || "", data.departureDate || "", data.destination || "",
      data.parentSpouseName || "", data.sponsorContact || "", data.hotelInfo || "",
      photoValue, ""
    ]);

    Logger.log("Application saved: " + appId + " photo: " + photoValue);
    return {success: true, applicationId: appId};
  } catch (err) {
    Logger.log("submitApplication error: " + err.toString());
    return {success: false, error: err.toString()};
  }
}


function forceAuth() {
  // This forces both Spreadsheet and Drive authorization
  var ss = SpreadsheetApp.openById(SS_ID);
  Logger.log("Spreadsheet: " + ss.getName());
  
  var file = DriveApp.getFileById(SS_ID);
  Logger.log("Drive file: " + file.getName());
  
  var parent = file.getParents().next();
  Logger.log("Parent folder: " + parent.getName());
  
  // Test creating folder
  var folders = parent.getFoldersByName("Visa_Photos");
  if (folders.hasNext()) {
    Logger.log("Visa_Photos folder already exists: " + folders.next().getId());
  } else {
    var f = parent.createFolder("Visa_Photos");
    Logger.log("Created Visa_Photos: " + f.getId());
  }
  
  // Test creating a tiny file
  var blob = Utilities.newBlob("test", "text/plain", "test.txt");
  var testFolder = parent.getFoldersByName("Visa_Photos").next();
  var testFile = testFolder.createFile(blob);
  Logger.log("Test file created: " + testFile.getId());
  testFile.setTrashed(true);
  Logger.log("Test file trashed. ALL PERMISSIONS OK!");
}


function getApplications(filter) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var appSheet = ss.getSheetByName("Applications");
    if (!appSheet || appSheet.getLastRow() < 2) return [];

    var data = appSheet.getRange(2, 1, appSheet.getLastRow() - 1, 26).getDisplayValues();
    var apps = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var status = row[2] ? row[2].trim() : "";
      if (filter && filter !== "All" && status !== filter) continue;

      var photoVal = row[24] || "";
      var photoThumb = "";
      var photoView = "";
      var photoFileId = "";

      if (photoVal.indexOf("DRIVE:") === 0) {
        photoFileId = photoVal.replace("DRIVE:", "");
        photoThumb = "https://drive.google.com/thumbnail?id=" + photoFileId + "&sz=w300";
        photoView = "https://drive.google.com/uc?id=" + photoFileId;
      } else if (photoVal.indexOf("data:") === 0) {
        photoThumb = photoVal;
        photoView = photoVal;
      }

      apps.push({
        applicationId: row[0] || "", submissionDate: row[1] || "", status: status,
        surname: row[3] || "", firstName: row[4] || "",
        dateOfBirth: row[5] || "", placeOfBirth: row[6] || "",
        nationality: row[7] || "", gender: row[8] || "", maritalStatus: row[9] || "",
        passportNumber: row[10] || "", issuingCountry: row[11] || "",
        dateOfIssue: row[12] || "", expirationDate: row[13] || "",
        homeAddress: row[14] || "", email: row[15] || "", telephone: row[16] || "",
        purposeOfTravel: row[17] || "", arrivalDate: row[18] || "",
        departureDate: row[19] || "", destination: row[20] || "",
        parentSpouseName: row[21] || "", sponsorContact: row[22] || "", hotelInfo: row[23] || "",
        photoThumb: photoThumb, photoView: photoView, photoFileId: photoFileId,
        adminNotes: row[25] || ""
      });
    }

    apps.sort(function(a, b) { return (b.submissionDate || "").localeCompare(a.submissionDate || ""); });
    return apps;
  } catch (err) {
    Logger.log("getApplications error: " + err.toString());
    return [];
  }
}

function trackApplication(appId) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var appSheet = ss.getSheetByName("Applications");
    if (!appSheet || appSheet.getLastRow() < 2) return {success: false, error: "No applications found."};

    var data = appSheet.getRange(2, 1, appSheet.getLastRow() - 1, 26).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(appId).trim()) {
        return {
          success: true,
          application: {
            applicationId: data[i][0] || "", submissionDate: data[i][1] || "",
            status: data[i][2] || "", surname: data[i][3] || "",
            firstName: data[i][4] || "", adminNotes: data[i][25] || ""
          }
        };
      }
    }
    return {success: false, error: "Application ID not found."};
  } catch (err) {
    return {success: false, error: err.toString()};
  }
}

function updateApplicationStatus(appId, newStatus, notes) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var appSheet = ss.getSheetByName("Applications");
    if (!appSheet) return {success: false, error: "Sheet not found."};

    var data = appSheet.getRange(2, 1, appSheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(appId).trim()) {
        appSheet.getRange(i + 2, 3).setValue(newStatus);
        if (notes !== undefined && notes !== null) appSheet.getRange(i + 2, 26).setValue(notes);
        return {success: true};
      }
    }
    return {success: false, error: "Application not found."};
  } catch (err) {
    return {success: false, error: err.toString()};
  }
}

function getDashboardStats() {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var appSheet = ss.getSheetByName("Applications");
    if (!appSheet || appSheet.getLastRow() < 2) return {total:0,pending:0,underReview:0,approved:0,rejected:0};

    var statuses = appSheet.getRange(2, 3, appSheet.getLastRow() - 1, 1).getDisplayValues();
    var t=statuses.length, p=0, u=0, a=0, r=0;
    for (var i = 0; i < statuses.length; i++) {
      var s = (statuses[i][0] || "").trim();
      if (s==="Pending") p++; else if (s==="Under Review") u++;
      else if (s==="Approved") a++; else if (s==="Rejected") r++;
    }
    return {total:t, pending:p, underReview:u, approved:a, rejected:r};
  } catch (err) {
    return {total:0, pending:0, underReview:0, approved:0, rejected:0};
  }
}


function getPageContent(page) {
  if (page === "admin") {
    return HtmlService.createHtmlOutputFromFile("AdminPortal").getContent();
  }
  if (page === "landing") {
    return HtmlService.createHtmlOutputFromFile("LandingPage").getContent();
  }
  return HtmlService.createHtmlOutputFromFile("VisaPortal").getContent();
}


function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

function deleteApplication(appId) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    var appSheet = ss.getSheetByName("Applications");
    if (!appSheet) return {success: false, error: "Sheet not found."};

    var data = appSheet.getRange(2, 1, appSheet.getLastRow() - 1, 26).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(appId).trim()) {
        var photoVal = data[i][24] || "";
        if (photoVal.indexOf("DRIVE:") === 0) {
          var fileId = photoVal.replace("DRIVE:", "");
          try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { Logger.log("Photo delete error: " + e); }
        }
        appSheet.deleteRow(i + 2);
        return {success: true};
      }
    }
    return {success: false, error: "Application not found."};
  } catch (err) {
    return {success: false, error: err.toString()};
  }
}


