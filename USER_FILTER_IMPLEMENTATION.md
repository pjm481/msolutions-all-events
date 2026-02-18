# Zoho CRM User-Based Filtering Implementation Guide

This guide explains how to implement a role-based data filtering system in a Zoho CRM Embedded App. It covers fetching detailed user data and applying conditional filtering based on the `User_Type`.

## 1. Fetching Detailed User Information

In a Zoho Embedded App, `ZOHO.CRM.CONFIG.getCurrentUser()` only provides basic information. To get detailed fields like `User_Type`, you must perform a secondary fetch from the `users` module.

### Implementation Pattern (App.jsx)

```javascript
useEffect(() => {
  // 1. Initialize the SDK
  ZOHO.embeddedApp.init().then(() => {
    // 2. Get the basic current user info
    ZOHO.CRM.CONFIG.getCurrentUser().then((data) => {
      const basicUser = data?.users?.[0];
      
      if (basicUser?.id) {
        // 3. Fetch full details from the 'users' entity
        ZOHO.CRM.API.getRecord({
          Entity: "users",
          approved: "both",
          RecordID: basicUser.id,
        }).then((userData) => {
          const detailUser = userData?.users?.[0];
          
          if (detailUser) {
            // Save full detailed user to global state
            setLoggedInUser(detailUser);
          } else {
            // Fallback to basic data
            setLoggedInUser(basicUser);
          }
        });
      }
    });
  });
}, []);
```

---

## 2. Conditional Filtering Logic

The core requirement is to restrict data view for standard staff while allowing management to see everything.

### The Business Rules
*   **Generic User**: Can only see records where they are the owner/host. Default filter = `[Logged-In User Name]`.
*   **Admin / Super Admin**: Can see all records across the organization. Default filter = `[]` (Empty/All).

### Logic Implementation (Component Level)

Define a reactive check for the user type and synchronize the filter state:

```javascript
// 1. Determine if the user has elevated privileges
const isAdmin = React.useMemo(() => {
  return (
    loggedInUser?.User_Type === "Admin" ||
    loggedInUser?.User_Type === "Super Admin"
  );
}, [loggedInUser]);

// 2. Synchronize the UI filter based on the user type
React.useEffect(() => {
  if (loggedInUser) {
    if (loggedInUser.User_Type === "Generic") {
      // Logic: Lock 'Generic' users to their own data on load
      setFilterUser([loggedInUser.full_name]);
    } else {
      // Logic: Admins/Super Admins see everything by default
      setFilterUser([]); // Empty array typically represents 'Select All'
    }
  }
}, [loggedInUser]);
```

---

## 3. Handling "Clear Filters"

When a user resets their view, the logic must respect their permissions. An Admin should reset to "See All," but a Generic user should reset to "See Only Me."

```javascript
const handleClearFilters = () => {
  // Reset other filters (Date, Type, etc.)
  setFilterType([]);
  setFilterPriority([]);
  
  // PERMISSION-BASED RESET
  if (isAdmin) {
    setFilterUser([]); // Reset to 'All' for management
  } else {
    setFilterUser([loggedInUser.full_name]); // Reset to personal view for staff
  }
};
```

---

## 4. Why Use This Approach?

1.  **Security by Default**: Standard users are immediately restricted as soon as the app loads.
2.  **Management Overview**: Admins skip the manual step of deselecting themselves to see the team's workload.
3.  **SDK Best Practices**: By fetching the `users` record explicitly, you gain access to `User_Type`, `Role`, `Profile`, and custom user fields that are not present in the initial handshake.

## Summary of `User_Type` Behavior

| User Type | App Load View | Clear Filter View | Reason |
| :--- | :--- | :--- | :--- |
| **Generic** | Filtered to [Me] | Filtered to [Me] | Focus on personal tasks. |
| **Admin** | Show All Records | Show All Records | Oversight of all activities. |
| **Super Admin** | Show All Records | Show All Records | Oversight of all activities. |
