from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime, date
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# MySQL Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'gearguard_user',
    'password': 'gearguard_pass',
    'database': 'gearguard'
}

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def init_database():
    """Initialize database with tables"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    try:
        # Create maintenance_teams table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_teams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team_name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create technicians table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS technicians (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                team_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES maintenance_teams(id) ON DELETE CASCADE
            )
        """)
        
        # Create equipment table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS equipment (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                serial_number VARCHAR(255) NOT NULL UNIQUE,
                department VARCHAR(255),
                assigned_employee VARCHAR(255),
                location VARCHAR(255),
                purchase_date DATE,
                warranty_end DATE,
                maintenance_team_id INT,
                is_scrapped BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (maintenance_team_id) REFERENCES maintenance_teams(id)
            )
        """)
        
        # Create maintenance_requests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject VARCHAR(255) NOT NULL,
                equipment_id INT NOT NULL,
                team_id INT NOT NULL,
                technician_id INT,
                request_type ENUM('Corrective', 'Preventive') NOT NULL,
                scheduled_date DATE,
                duration_hours DECIMAL(5,2),
                status ENUM('New', 'In Progress', 'Repaired', 'Scrap') DEFAULT 'New',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
                FOREIGN KEY (team_id) REFERENCES maintenance_teams(id),
                FOREIGN KEY (technician_id) REFERENCES technicians(id)
            )
        """)
        
        connection.commit()
        print("Database tables created successfully")
        
        # Insert seed data if tables are empty
        cursor.execute("SELECT COUNT(*) FROM maintenance_teams")
        if cursor.fetchone()[0] == 0:
            # Seed teams
            teams = [
                ('Mechanics', 'Mechanical equipment maintenance'),
                ('Electricians', 'Electrical systems maintenance'),
                ('IT Support', 'Computer and network maintenance')
            ]
            cursor.executemany(
                "INSERT INTO maintenance_teams (team_name, description) VALUES (%s, %s)",
                teams
            )
            
            # Seed technicians
            technicians = [
                ('John Smith', 'john.smith@gearguard.com', 1),
                ('Mike Johnson', 'mike.j@gearguard.com', 1),
                ('Sarah Williams', 'sarah.w@gearguard.com', 2),
                ('Emily Brown', 'emily.b@gearguard.com', 2),
                ('David Lee', 'david.l@gearguard.com', 3),
                ('Lisa Chen', 'lisa.c@gearguard.com', 3)
            ]
            cursor.executemany(
                "INSERT INTO technicians (name, email, team_id) VALUES (%s, %s, %s)",
                technicians
            )
            
            # Seed equipment
            equipment = [
                ('CNC Machine A1', 'CNC-001', 'Production', 'Tom Hardy', 'Floor 1 - Zone A', '2022-01-15', '2025-01-15', 1, False),
                ('Lathe Machine', 'LTH-002', 'Production', 'Jane Doe', 'Floor 1 - Zone B', '2021-06-10', '2024-06-10', 1, False),
                ('Generator Unit', 'GEN-003', 'Power', 'Bob Smith', 'Basement', '2020-03-20', '2025-03-20', 2, False),
                ('Server Rack', 'SRV-004', 'IT', 'Alice Johnson', 'Data Center', '2023-05-12', '2026-05-12', 3, False),
                ('Air Compressor', 'CMP-005', 'Production', 'Charlie Brown', 'Floor 2', '2021-11-30', '2024-11-30', 1, False)
            ]
            cursor.executemany(
                """INSERT INTO equipment (name, serial_number, department, assigned_employee, 
                location, purchase_date, warranty_end, maintenance_team_id, is_scrapped) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                equipment
            )
            
            connection.commit()
            print("Seed data inserted successfully")
        
        return True
    except Error as e:
        print(f"Error initializing database: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

# Initialize database on startup
init_database()

# Helper function to serialize dates
def serialize_row(row, columns):
    result = {}
    for i, col in enumerate(columns):
        value = row[i]
        if isinstance(value, (date, datetime)):
            result[col] = value.isoformat()
        else:
            result[col] = value
    return result

# ============== MAINTENANCE TEAMS ENDPOINTS ==============

@app.route('/api/teams', methods=['GET'])
def get_teams():
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("SELECT id, team_name, description, created_at FROM maintenance_teams ORDER BY team_name")
    columns = ['id', 'team_name', 'description', 'created_at']
    teams = [serialize_row(row, columns) for row in cursor.fetchall()]
    
    cursor.close()
    connection.close()
    return jsonify(teams)

@app.route('/api/teams', methods=['POST'])
def create_team():
    data = request.json
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO maintenance_teams (team_name, description) VALUES (%s, %s)",
            (data['team_name'], data.get('description', ''))
        )
        connection.commit()
        team_id = cursor.lastrowid
        
        cursor.execute("SELECT id, team_name, description, created_at FROM maintenance_teams WHERE id = %s", (team_id,))
        columns = ['id', 'team_name', 'description', 'created_at']
        team = serialize_row(cursor.fetchone(), columns)
        
        return jsonify(team), 201
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        connection.close()

@app.route('/api/teams/<int:team_id>/technicians', methods=['GET'])
def get_team_technicians(team_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute(
        "SELECT id, name, email, team_id FROM technicians WHERE team_id = %s ORDER BY name",
        (team_id,)
    )
    columns = ['id', 'name', 'email', 'team_id']
    technicians = [serialize_row(row, columns) for row in cursor.fetchall()]
    
    cursor.close()
    connection.close()
    return jsonify(technicians)

# ============== TECHNICIANS ENDPOINTS ==============

@app.route('/api/technicians', methods=['GET'])
def get_technicians():
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT t.id, t.name, t.email, t.team_id, mt.team_name 
        FROM technicians t 
        LEFT JOIN maintenance_teams mt ON t.team_id = mt.id
        ORDER BY t.name
    """)
    columns = ['id', 'name', 'email', 'team_id', 'team_name']
    technicians = [serialize_row(row, columns) for row in cursor.fetchall()]
    
    cursor.close()
    connection.close()
    return jsonify(technicians)

@app.route('/api/technicians', methods=['POST'])
def create_technician():
    data = request.json
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO technicians (name, email, team_id) VALUES (%s, %s, %s)",
            (data['name'], data['email'], data['team_id'])
        )
        connection.commit()
        tech_id = cursor.lastrowid
        
        cursor.execute("""
            SELECT t.id, t.name, t.email, t.team_id, mt.team_name 
            FROM technicians t 
            LEFT JOIN maintenance_teams mt ON t.team_id = mt.id
            WHERE t.id = %s
        """, (tech_id,))
        columns = ['id', 'name', 'email', 'team_id', 'team_name']
        technician = serialize_row(cursor.fetchone(), columns)
        
        return jsonify(technician), 201
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        connection.close()

# ============== EQUIPMENT ENDPOINTS ==============

@app.route('/api/equipment', methods=['GET'])
def get_equipment():
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT e.id, e.name, e.serial_number, e.department, e.assigned_employee, 
               e.location, e.purchase_date, e.warranty_end, e.maintenance_team_id, 
               e.is_scrapped, mt.team_name
        FROM equipment e
        LEFT JOIN maintenance_teams mt ON e.maintenance_team_id = mt.id
        ORDER BY e.name
    """)
    columns = ['id', 'name', 'serial_number', 'department', 'assigned_employee', 
               'location', 'purchase_date', 'warranty_end', 'maintenance_team_id', 
               'is_scrapped', 'team_name']
    equipment_list = [serialize_row(row, columns) for row in cursor.fetchall()]
    
    cursor.close()
    connection.close()
    return jsonify(equipment_list)

@app.route('/api/equipment/<int:equipment_id>', methods=['GET'])
def get_equipment_by_id(equipment_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT e.id, e.name, e.serial_number, e.department, e.assigned_employee, 
               e.location, e.purchase_date, e.warranty_end, e.maintenance_team_id, 
               e.is_scrapped, mt.team_name
        FROM equipment e
        LEFT JOIN maintenance_teams mt ON e.maintenance_team_id = mt.id
        WHERE e.id = %s
    """, (equipment_id,))
    result = cursor.fetchone()
    
    if result:
        columns = ['id', 'name', 'serial_number', 'department', 'assigned_employee', 
                   'location', 'purchase_date', 'warranty_end', 'maintenance_team_id', 
                   'is_scrapped', 'team_name']
        equipment = serialize_row(result, columns)
    else:
        equipment = None
    
    cursor.close()
    connection.close()
    
    if equipment:
        return jsonify(equipment)
    return jsonify({'error': 'Equipment not found'}), 404

@app.route('/api/equipment', methods=['POST'])
def create_equipment():
    data = request.json
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO equipment (name, serial_number, department, assigned_employee, 
                                   location, purchase_date, warranty_end, maintenance_team_id, is_scrapped)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['name'],
            data['serial_number'],
            data.get('department'),
            data.get('assigned_employee'),
            data.get('location'),
            data.get('purchase_date'),
            data.get('warranty_end'),
            data.get('maintenance_team_id'),
            data.get('is_scrapped', False)
        ))
        connection.commit()
        equipment_id = cursor.lastrowid
        
        cursor.execute("""
            SELECT e.id, e.name, e.serial_number, e.department, e.assigned_employee, 
                   e.location, e.purchase_date, e.warranty_end, e.maintenance_team_id, 
                   e.is_scrapped, mt.team_name
            FROM equipment e
            LEFT JOIN maintenance_teams mt ON e.maintenance_team_id = mt.id
            WHERE e.id = %s
        """, (equipment_id,))
        columns = ['id', 'name', 'serial_number', 'department', 'assigned_employee', 
                   'location', 'purchase_date', 'warranty_end', 'maintenance_team_id', 
                   'is_scrapped', 'team_name']
        equipment = serialize_row(cursor.fetchone(), columns)
        
        return jsonify(equipment), 201
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        connection.close()

@app.route('/api/equipment/<int:equipment_id>', methods=['PUT'])
def update_equipment(equipment_id):
    data = request.json
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    try:
        cursor.execute("""
            UPDATE equipment 
            SET name = %s, serial_number = %s, department = %s, assigned_employee = %s,
                location = %s, purchase_date = %s, warranty_end = %s, 
                maintenance_team_id = %s, is_scrapped = %s
            WHERE id = %s
        """, (
            data['name'],
            data['serial_number'],
            data.get('department'),
            data.get('assigned_employee'),
            data.get('location'),
            data.get('purchase_date'),
            data.get('warranty_end'),
            data.get('maintenance_team_id'),
            data.get('is_scrapped', False),
            equipment_id
        ))
        connection.commit()
        
        cursor.execute("""
            SELECT e.id, e.name, e.serial_number, e.department, e.assigned_employee, 
                   e.location, e.purchase_date, e.warranty_end, e.maintenance_team_id, 
                   e.is_scrapped, mt.team_name
            FROM equipment e
            LEFT JOIN maintenance_teams mt ON e.maintenance_team_id = mt.id
            WHERE e.id = %s
        """, (equipment_id,))
        columns = ['id', 'name', 'serial_number', 'department', 'assigned_employee', 
                   'location', 'purchase_date', 'warranty_end', 'maintenance_team_id', 
                   'is_scrapped', 'team_name']
        equipment = serialize_row(cursor.fetchone(), columns)
        
        return jsonify(equipment)
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        connection.close()

@app.route('/api/equipment/<int:equipment_id>/maintenance_count', methods=['GET'])
def get_maintenance_count(equipment_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT COUNT(*) FROM maintenance_requests 
        WHERE equipment_id = %s AND status IN ('New', 'In Progress')
    """, (equipment_id,))
    count = cursor.fetchone()[0]
    
    cursor.close()
    connection.close()
    return jsonify({'count': count})

# ============== MAINTENANCE REQUESTS ENDPOINTS ==============

@app.route('/api/requests', methods=['GET'])
def get_requests():
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT mr.id, mr.subject, mr.equipment_id, mr.team_id, mr.technician_id,
               mr.request_type, mr.scheduled_date, mr.duration_hours, mr.status,
               mr.created_at, mr.updated_at,
               e.name as equipment_name, e.serial_number,
               mt.team_name,
               t.name as technician_name, t.email as technician_email
        FROM maintenance_requests mr
        LEFT JOIN equipment e ON mr.equipment_id = e.id
        LEFT JOIN maintenance_teams mt ON mr.team_id = mt.id
        LEFT JOIN technicians t ON mr.technician_id = t.id
        ORDER BY mr.created_at DESC
    """)
    columns = ['id', 'subject', 'equipment_id', 'team_id', 'technician_id',
               'request_type', 'scheduled_date', 'duration_hours', 'status',
               'created_at', 'updated_at', 'equipment_name', 'serial_number',
               'team_name', 'technician_name', 'technician_email']
    requests = [serialize_row(row, columns) for row in cursor.fetchall()]
    
    cursor.close()
    connection.close()
    return jsonify(requests)

@app.route('/api/requests', methods=['POST'])
def create_request():
    data = request.json
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    try:
        # Get equipment's team_id for auto-fill
        cursor.execute("SELECT maintenance_team_id FROM equipment WHERE id = %s", (data['equipment_id'],))
        result = cursor.fetchone()
        team_id = result[0] if result else data.get('team_id')
        
        cursor.execute("""
            INSERT INTO maintenance_requests (subject, equipment_id, team_id, technician_id,
                                              request_type, scheduled_date, duration_hours, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['subject'],
            data['equipment_id'],
            team_id,
            data.get('technician_id'),
            data['request_type'],
            data.get('scheduled_date'),
            data.get('duration_hours'),
            data.get('status', 'New')
        ))
        connection.commit()
        request_id = cursor.lastrowid
        
        cursor.execute("""
            SELECT mr.id, mr.subject, mr.equipment_id, mr.team_id, mr.technician_id,
                   mr.request_type, mr.scheduled_date, mr.duration_hours, mr.status,
                   mr.created_at, mr.updated_at,
                   e.name as equipment_name, e.serial_number,
                   mt.team_name,
                   t.name as technician_name, t.email as technician_email
            FROM maintenance_requests mr
            LEFT JOIN equipment e ON mr.equipment_id = e.id
            LEFT JOIN maintenance_teams mt ON mr.team_id = mt.id
            LEFT JOIN technicians t ON mr.technician_id = t.id
            WHERE mr.id = %s
        """, (request_id,))
        columns = ['id', 'subject', 'equipment_id', 'team_id', 'technician_id',
                   'request_type', 'scheduled_date', 'duration_hours', 'status',
                   'created_at', 'updated_at', 'equipment_name', 'serial_number',
                   'team_name', 'technician_name', 'technician_email']
        new_request = serialize_row(cursor.fetchone(), columns)
        
        return jsonify(new_request), 201
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        connection.close()

@app.route('/api/requests/<int:request_id>', methods=['PUT'])
def update_request(request_id):
    data = request.json
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    try:
        # Validation: Duration required before marking as Repaired
        if data.get('status') == 'Repaired' and not data.get('duration_hours'):
            return jsonify({'error': 'Duration is required before marking as Repaired'}), 400
        
        # Update request
        cursor.execute("""
            UPDATE maintenance_requests 
            SET subject = %s, technician_id = %s, scheduled_date = %s, 
                duration_hours = %s, status = %s
            WHERE id = %s
        """, (
            data.get('subject'),
            data.get('technician_id'),
            data.get('scheduled_date'),
            data.get('duration_hours'),
            data.get('status'),
            request_id
        ))
        
        # If status is Scrap, mark equipment as scrapped
        if data.get('status') == 'Scrap':
            cursor.execute("""
                UPDATE equipment e
                INNER JOIN maintenance_requests mr ON e.id = mr.equipment_id
                SET e.is_scrapped = TRUE
                WHERE mr.id = %s
            """, (request_id,))
        
        connection.commit()
        
        cursor.execute("""
            SELECT mr.id, mr.subject, mr.equipment_id, mr.team_id, mr.technician_id,
                   mr.request_type, mr.scheduled_date, mr.duration_hours, mr.status,
                   mr.created_at, mr.updated_at,
                   e.name as equipment_name, e.serial_number,
                   mt.team_name,
                   t.name as technician_name, t.email as technician_email
            FROM maintenance_requests mr
            LEFT JOIN equipment e ON mr.equipment_id = e.id
            LEFT JOIN maintenance_teams mt ON mr.team_id = mt.id
            LEFT JOIN technicians t ON mr.technician_id = t.id
            WHERE mr.id = %s
        """, (request_id,))
        columns = ['id', 'subject', 'equipment_id', 'team_id', 'technician_id',
                   'request_type', 'scheduled_date', 'duration_hours', 'status',
                   'created_at', 'updated_at', 'equipment_name', 'serial_number',
                   'team_name', 'technician_name', 'technician_email']
        updated_request = serialize_row(cursor.fetchone(), columns)
        
        return jsonify(updated_request)
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        connection.close()

@app.route('/api/requests/kanban', methods=['GET'])
def get_kanban_requests():
    """Get requests grouped by status for Kanban board"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT mr.id, mr.subject, mr.equipment_id, mr.team_id, mr.technician_id,
               mr.request_type, mr.scheduled_date, mr.duration_hours, mr.status,
               mr.created_at, mr.updated_at,
               e.name as equipment_name, e.serial_number,
               mt.team_name,
               t.name as technician_name, t.email as technician_email
        FROM maintenance_requests mr
        LEFT JOIN equipment e ON mr.equipment_id = e.id
        LEFT JOIN maintenance_teams mt ON mr.team_id = mt.id
        LEFT JOIN technicians t ON mr.technician_id = t.id
        ORDER BY mr.created_at DESC
    """)
    columns = ['id', 'subject', 'equipment_id', 'team_id', 'technician_id',
               'request_type', 'scheduled_date', 'duration_hours', 'status',
               'created_at', 'updated_at', 'equipment_name', 'serial_number',
               'team_name', 'technician_name', 'technician_email']
    all_requests = [serialize_row(row, columns) for row in cursor.fetchall()]
    
    # Group by status
    kanban_data = {
        'New': [],
        'In Progress': [],
        'Repaired': [],
        'Scrap': []
    }
    
    for req in all_requests:
        status = req['status']
        if status in kanban_data:
            kanban_data[status].append(req)
    
    cursor.close()
    connection.close()
    return jsonify(kanban_data)

@app.route('/api/requests/calendar', methods=['GET'])
def get_calendar_requests():
    """Get preventive maintenance requests for calendar view"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    cursor.execute("""
        SELECT mr.id, mr.subject, mr.equipment_id, mr.team_id, mr.technician_id,
               mr.request_type, mr.scheduled_date, mr.duration_hours, mr.status,
               mr.created_at,
               e.name as equipment_name,
               t.name as technician_name
        FROM maintenance_requests mr
        LEFT JOIN equipment e ON mr.equipment_id = e.id
        LEFT JOIN technicians t ON mr.technician_id = t.id
        WHERE mr.request_type = 'Preventive' AND mr.scheduled_date IS NOT NULL
        ORDER BY mr.scheduled_date
    """)
    columns = ['id', 'subject', 'equipment_id', 'team_id', 'technician_id',
               'request_type', 'scheduled_date', 'duration_hours', 'status',
               'created_at', 'equipment_name', 'technician_name']
    requests = [serialize_row(row, columns) for row in cursor.fetchall()]
    
    cursor.close()
    connection.close()
    return jsonify(requests)

# ============== DASHBOARD / STATS ENDPOINTS ==============

@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_stats():
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = connection.cursor()
    
    # Total equipment
    cursor.execute("SELECT COUNT(*) FROM equipment WHERE is_scrapped = FALSE")
    total_equipment = cursor.fetchone()[0]
    
    # Total teams
    cursor.execute("SELECT COUNT(*) FROM maintenance_teams")
    total_teams = cursor.fetchone()[0]
    
    # Open requests
    cursor.execute("SELECT COUNT(*) FROM maintenance_requests WHERE status IN ('New', 'In Progress')")
    open_requests = cursor.fetchone()[0]
    
    # Completed requests
    cursor.execute("SELECT COUNT(*) FROM maintenance_requests WHERE status = 'Repaired'")
    completed_requests = cursor.fetchone()[0]
    
    # Requests by team
    cursor.execute("""
        SELECT mt.team_name, COUNT(mr.id) as request_count
        FROM maintenance_teams mt
        LEFT JOIN maintenance_requests mr ON mt.id = mr.team_id
        GROUP BY mt.id, mt.team_name
        ORDER BY request_count DESC
    """)
    requests_by_team = [{'team': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    # Requests by equipment
    cursor.execute("""
        SELECT e.name, COUNT(mr.id) as request_count
        FROM equipment e
        LEFT JOIN maintenance_requests mr ON e.id = mr.equipment_id
        GROUP BY e.id, e.name
        ORDER BY request_count DESC
        LIMIT 5
    """)
    requests_by_equipment = [{'equipment': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    stats = {
        'total_equipment': total_equipment,
        'total_teams': total_teams,
        'open_requests': open_requests,
        'completed_requests': completed_requests,
        'requests_by_team': requests_by_team,
        'requests_by_equipment': requests_by_equipment
    }
    
    cursor.close()
    connection.close()
    return jsonify(stats)

@app.route('/api/', methods=['GET'])
def health_check():
    return jsonify({'message': 'GearGuard API is running', 'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=True)