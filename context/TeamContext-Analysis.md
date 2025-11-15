# TeamContext Analysis and Responsibilities

## Core Responsibilities

### 1. Team State Management
- **Current Team**: Manages the currently selected team
- **Teams Collection**: Maintains a list of all teams for the current sport
- **Sport Integration**: Filters teams by selected sport
- **Error Handling**: Manages error states with timestamps and codes

### 2. Team CRUD Operations
- **Create Team**: Creates new teams with default configurations
- **Select Team**: Changes the active team
- **Rename Team**: Updates team names
- **Remove Team**: Deletes teams from the collection

### 3. Player Management
- **Add Player**: Creates new players and adds them to bench
- **Rename Player**: Updates player names
- **Delete Player**: Removes players from team
- **Move Players**: Between bench and court positions
- **Update Positions**: Manages player court positions
- **Set Player Types**: Updates player position types (e.g., goalkeeper, forward)

### 4. Configuration Management
- **Multiple Configurations**: Teams can have multiple court configurations
- **Configuration CRUD**: Create, select, rename, delete configurations
- **Configuration Navigation**: Switch between next/previous configurations
- **Position Mapping**: Each configuration maps player IDs to court positions
- **Migration Support**: Handles legacy teams without configurations

### 5. Import/Export Operations
- **Export Teams**: Save teams to files for sharing
- **Import Teams**: Load teams from files
- **File Operations**: Handle file system operations with proper error handling
- **Name Conflict Resolution**: Handle duplicate team names during import

### 6. Utility Functions
- **Find Free Position**: Calculates available court positions
- **Position Validation**: Ensures positions are within court bounds
- **Player Position Utils**: Various position-related calculations

## Key Dependencies
- **SportContext**: For current sport selection
- **useTeamData**: Custom hook for data persistence and loading
- **useTranslation**: For internationalization
- **File System**: For import/export operations

## Data Flow
1. **Initialization**: Load teams from storage, filter by sport
2. **Team Selection**: Auto-select appropriate team for current sport
3. **State Updates**: All changes trigger re-renders and persistence
4. **Configuration Migration**: Automatically upgrade legacy team formats

## Critical Features for TDD Implementation
1. **Team Creation and Selection** (Core functionality)
2. **Player Management** (Add, remove, move between bench/court)
3. **Configuration Management** (Multiple court setups)
4. **Data Persistence** (Save/load state)
5. **Error Handling** (Graceful failure management)

## Implementation Strategy
1. Start with basic team and player management
2. Add configuration support
3. Implement import/export functionality
4. Add comprehensive error handling
5. Optimize performance and add advanced features
