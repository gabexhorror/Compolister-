from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
import json
import re
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///inventory.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.urandom(24)  # Random secret key for sessions
db = SQLAlchemy(app)

# ============ UTILITY FUNCTIONS ============
def parse_resistance(value_str):
    """Parse resistance value string to ohms"""
    if not value_str:
        return None
    
    value_str = value_str.lower().replace(' ', '').replace('ω', '').replace('ohm', '')
    
    match = re.match(r'([\d.]+)\s*([km]?)', value_str)
    if not match:
        return None
    
    try:
        value = float(match.group(1))
        multiplier = match.group(2)
        
        if multiplier == 'k':
            value *= 1000
        elif multiplier == 'm':
            value *= 1000000
        
        return value
    except:
        return None

def parse_capacitance(value_str):
    """Parse capacitance value string to farads"""
    if not value_str:
        return None
    
    value_str = value_str.lower().replace(' ', '')
    
    match = re.match(r'([\d.]+)\s*(pf|nf|uf|mf|f)?', value_str)
    if not match:
        return None
    
    try:
        value = float(match.group(1))
        unit = match.group(2) or 'uf'
        
        multipliers = {
            'pf': 1e-12,
            'nf': 1e-9,
            'uf': 1e-6,
            'mf': 1e-3,
            'f': 1
        }
        
        return value * multipliers.get(unit, 1e-6)
    except:
        return None

def get_resistor_colors(resistance_ohms, tolerance=None):
    """Calculate resistor color bands from resistance in ohms"""
    if not resistance_ohms or resistance_ohms <= 0:
        return None
    
    color_map = {
        0: 'black', 1: 'brown', 2: 'red', 3: 'orange', 4: 'yellow',
        5: 'green', 6: 'blue', 7: 'violet', 8: 'gray', 9: 'white'
    }
    
    tolerance_colors = {
        '1%': 'brown', '2%': 'red', '0.5%': 'green', '0.25%': 'blue',
        '0.1%': 'violet', '0.05%': 'gray', '5%': 'gold', '10%': 'silver',
        '20%': 'none'
    }
    
    if resistance_ohms >= 100:
        temp = resistance_ohms
        while temp >= 100:
            temp /= 10
        first_digit = int(temp)
        second_digit = int((temp - first_digit) * 10)
        multiplier = len(str(int(resistance_ohms))) - 2
    elif resistance_ohms >= 10:
        first_digit = int(resistance_ohms / 10)
        second_digit = int(resistance_ohms % 10)
        multiplier = 0
    else:
        first_digit = int(resistance_ohms)
        second_digit = int((resistance_ohms - first_digit) * 10)
        multiplier = -1
    
    multiplier_colors = {
        -3: 'pink', -2: 'silver', -1: 'gold', 0: 'black', 1: 'brown',
        2: 'red', 3: 'orange', 4: 'yellow', 5: 'green', 6: 'blue',
        7: 'violet', 8: 'gray', 9: 'white'
    }
    
    colors = [
        color_map.get(first_digit % 10, 'black'),
        color_map.get(second_digit % 10, 'black'),
        multiplier_colors.get(multiplier, 'black')
    ]
    
    tol_color = tolerance_colors.get(tolerance, 'gold')
    colors.append(tol_color)
    
    return colors

def get_capacitor_code(capacitance_farads):
    """Calculate capacitor code from capacitance in farads"""
    if not capacitance_farads or capacitance_farads <= 0:
        return None
    
    pf_value = capacitance_farads * 1e12
    
    if pf_value < 10:
        return f"{pf_value:.1f}pF"
    elif pf_value < 100:
        return f"{int(pf_value)}pF"
    elif pf_value < 1000:
        return f"{int(pf_value)}"
    else:
        pf_str = str(int(pf_value))
        first_digits = pf_str[:2]
        multiplier = len(pf_str) - 1
        return f"{first_digits}{multiplier}"

# ============ AUTHENTICATION DECORATOR ============
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# ============ DATABASE MODELS ============
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    components = db.relationship('Component', backref='user', lazy=True)
    projects = db.relationship('Project', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Component(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.String(100))
    quantity = db.Column(db.Integer, default=0)
    location = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Component-specific specifications
    resistance_value = db.Column(db.Float)
    tolerance = db.Column(db.String(20))
    wattage = db.Column(db.Float)
    capacitance_value = db.Column(db.Float)
    voltage_rating = db.Column(db.Float)
    capacitor_type = db.Column(db.String(50))
    forward_voltage = db.Column(db.Float)
    current_rating = db.Column(db.Float)
    package_type = db.Column(db.String(50))
    pin_count = db.Column(db.Integer)
    
    def to_dict(self):
        resistance_ohms = self.resistance_value
        if not resistance_ohms and self.value:
            resistance_ohms = parse_resistance(self.value)
        
        color_code = None
        if self.type == 'resistor' and resistance_ohms:
            color_code = get_resistor_colors(resistance_ohms, self.tolerance)
        
        capacitance_farads = self.capacitance_value
        if not capacitance_farads and self.value:
            capacitance_farads = parse_capacitance(self.value)
        
        cap_code = None
        if self.type == 'capacitor' and capacitance_farads:
            cap_code = get_capacitor_code(capacitance_farads)
        
        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'value': self.value,
            'quantity': self.quantity,
            'location': self.location,
            'notes': self.notes,
            'resistance_value': resistance_ohms,
            'tolerance': self.tolerance,
            'wattage': self.wattage,
            'capacitance_value': capacitance_farads,
            'voltage_rating': self.voltage_rating,
            'capacitor_type': self.capacitor_type,
            'forward_voltage': self.forward_voltage,
            'current_rating': self.current_rating,
            'package_type': self.package_type,
            'pin_count': self.pin_count,
            'color_code': color_code,
            'capacitor_code': cap_code,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(50), default='Planning')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'components': [pc.to_dict() for pc in self.project_components]
        }

class ProjectComponent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    component_id = db.Column(db.Integer, db.ForeignKey('component.id'), nullable=False)
    quantity_needed = db.Column(db.Integer, default=1)
    
    project = db.relationship('Project', backref=db.backref('project_components', lazy=True))
    component = db.relationship('Component')
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'component_id': self.component_id,
            'component_name': self.component.name,
            'component_type': self.component.type,
            'component_value': self.component.value,
            'quantity_needed': self.quantity_needed
        }

# ============ AUTH ROUTES ============
@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/register')
def register_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('register.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    
    # Validate input
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not username or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Check if user exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Create user
    user = User(username=username, email=email)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    # Log them in
    session['user_id'] = user.id
    session['username'] = user.username
    
    return jsonify(user.to_dict()), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    session['user_id'] = user.id
    session['username'] = user.username
    
    return jsonify(user.to_dict())

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/current_user')
def current_user():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify(user.to_dict())
    return jsonify({'error': 'Not logged in'}), 401

# ============ MAIN ROUTES ============
@app.route('/')
@login_required
def index():
    return render_template('index.html')

# ============ COMPONENT API ============
@app.route('/api/components', methods=['GET'])
@login_required
def get_components():
    components = Component.query.filter_by(user_id=session['user_id']).all()
    return jsonify([c.to_dict() for c in components])

@app.route('/api/components', methods=['POST'])
@login_required
def add_component():
    data = request.json
    
    component = Component(
        user_id=session['user_id'],
        type=data.get('type', 'other'),
        name=data.get('name', ''),
        value=data.get('value', ''),
        quantity=data.get('quantity', 0),
        location=data.get('location', ''),
        notes=data.get('notes', ''),
        resistance_value=data.get('resistance_value'),
        tolerance=data.get('tolerance'),
        wattage=data.get('wattage'),
        capacitance_value=data.get('capacitance_value'),
        voltage_rating=data.get('voltage_rating'),
        capacitor_type=data.get('capacitor_type'),
        forward_voltage=data.get('forward_voltage'),
        current_rating=data.get('current_rating'),
        package_type=data.get('package_type'),
        pin_count=data.get('pin_count')
    )
    
    db.session.add(component)
    db.session.commit()
    
    return jsonify(component.to_dict()), 201

@app.route('/api/components/<int:id>', methods=['PUT'])
@login_required
def update_component(id):
    component = Component.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.json
    
    for field in ['type', 'name', 'value', 'quantity', 'location', 'notes',
                  'resistance_value', 'tolerance', 'wattage', 'capacitance_value',
                  'voltage_rating', 'capacitor_type', 'forward_voltage',
                  'current_rating', 'package_type', 'pin_count']:
        if field in data:
            setattr(component, field, data[field])
    
    db.session.commit()
    return jsonify(component.to_dict())

@app.route('/api/components/<int:id>', methods=['DELETE'])
@login_required
def delete_component(id):
    component = Component.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    db.session.delete(component)
    db.session.commit()
    return '', 204

@app.route('/api/components/search')
@login_required
def search_components():
    query = request.args.get('q', '')
    type_filter = request.args.get('type', '')
    
    components_query = Component.query.filter_by(user_id=session['user_id'])
    
    if query:
        components_query = components_query.filter(
            db.or_(
                Component.name.ilike(f'%{query}%'),
                Component.value.ilike(f'%{query}%'),
                Component.notes.ilike(f'%{query}%')
            )
        )
    
    if type_filter:
        components_query = components_query.filter_by(type=type_filter)
    
    components = components_query.all()
    return jsonify([c.to_dict() for c in components])

# ============ PROJECT API ============
@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    projects = Project.query.filter_by(user_id=session['user_id']).all()
    return jsonify([p.to_dict() for p in projects])

@app.route('/api/projects', methods=['POST'])
@login_required
def add_project():
    data = request.json
    
    project = Project(
        user_id=session['user_id'],
        name=data.get('name', ''),
        description=data.get('description', ''),
        status=data.get('status', 'Planning')
    )
    
    db.session.add(project)
    db.session.commit()
    
    if 'components' in data:
        for comp in data['components']:
            # Verify component belongs to user
            component = Component.query.filter_by(
                id=comp['component_id'], 
                user_id=session['user_id']
            ).first()
            
            if component:
                pc = ProjectComponent(
                    project_id=project.id,
                    component_id=comp['component_id'],
                    quantity_needed=comp.get('quantity_needed', 1)
                )
                db.session.add(pc)
        db.session.commit()
    
    return jsonify(project.to_dict()), 201

@app.route('/api/projects/<int:id>', methods=['PUT'])
@login_required
def update_project(id):
    project = Project.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    data = request.json
    
    project.name = data.get('name', project.name)
    project.description = data.get('description', project.description)
    project.status = data.get('status', project.status)
    
    if 'components' in data:
        ProjectComponent.query.filter_by(project_id=id).delete()
        for comp in data['components']:
            component = Component.query.filter_by(
                id=comp['component_id'], 
                user_id=session['user_id']
            ).first()
            
            if component:
                pc = ProjectComponent(
                    project_id=id,
                    component_id=comp['component_id'],
                    quantity_needed=comp.get('quantity_needed', 1)
                )
                db.session.add(pc)
    
    db.session.commit()
    return jsonify(project.to_dict())

@app.route('/api/projects/<int:id>', methods=['DELETE'])
@login_required
def delete_project(id):
    project = Project.query.filter_by(id=id, user_id=session['user_id']).first_or_404()
    ProjectComponent.query.filter_by(project_id=id).delete()
    db.session.delete(project)
    db.session.commit()
    return '', 204

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)