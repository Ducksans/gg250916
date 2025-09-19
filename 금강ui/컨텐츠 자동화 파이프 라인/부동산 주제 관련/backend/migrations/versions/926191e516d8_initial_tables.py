"""initial_tables

Revision ID: 926191e516d8
Revises: 
Create Date: 2025-09-18 21:29:16.840949

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '926191e516d8'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    user_role_enum = sa.Enum('admin', 'agent', 'user', name='userrole')
    property_type_enum = sa.Enum('apartment', 'officetel', 'villa', 'house', 'land', 'commercial', name='propertytype')
    transaction_type_enum = sa.Enum('sale', 'rent', 'lease', name='transactiontype')
    property_status_enum = sa.Enum('available', 'pending', 'sold', 'rented', 'hidden', name='propertystatus')
    
    # Create tables
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, index=True),
        sa.Column('email', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True, index=True),
        sa.Column('phone_number', sa.String(), nullable=True, unique=True, index=True),
        sa.Column('role', user_role_enum, nullable=False, server_default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('profile_image_url', sa.String(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), 
                 onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'properties',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, index=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('property_type', property_type_enum, nullable=False),
        sa.Column('transaction_type', transaction_type_enum, nullable=False),
        sa.Column('price', sa.Integer(), nullable=False),
        sa.Column('monthly_rent', sa.Integer(), nullable=True),
        sa.Column('maintenance_fee', sa.Integer(), nullable=True),
        sa.Column('area', sa.Float(), nullable=False),
        sa.Column('floor', sa.Integer(), nullable=True),
        sa.Column('building_floor', sa.Integer(), nullable=True),
        sa.Column('room_count', sa.Integer(), nullable=True),
        sa.Column('bathroom_count', sa.Integer(), nullable=True),
        sa.Column('address', sa.String(200), nullable=False),
        sa.Column('address_detail', sa.String(200), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('status', property_status_enum, nullable=False, server_default='available'),
        sa.Column('is_parking', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_elevator', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_loan_possible', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_pet', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('move_in_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), 
                 onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'property_images',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, index=True),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('is_main', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('property_id', sa.Integer(), sa.ForeignKey('properties.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'property_features',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('property_id', sa.Integer(), sa.ForeignKey('properties.id', ondelete='CASCADE'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'search_histories',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True, index=True),
        sa.Column('query', sa.String(255), nullable=False),
        sa.Column('search_type', sa.String(50), nullable=False),
        sa.Column('search_params', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_properties_owner_id'), 'properties', ['owner_id'], unique=False)
    op.create_index(op.f('ix_property_images_property_id'), 'property_images', ['property_id'], unique=False)
    op.create_index(op.f('ix_property_features_property_id'), 'property_features', ['property_id'], unique=False)
    op.create_index(op.f('ix_search_histories_user_id'), 'search_histories', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_search_histories_user_id', table_name='search_histories')
    op.drop_index('ix_property_features_property_id', table_name='property_features')
    op.drop_index('ix_property_images_property_id', table_name='property_images')
    op.drop_index('ix_properties_owner_id', table_name='properties')
    
    # Drop tables
    op.drop_table('search_histories')
    op.drop_table('property_features')
    op.drop_table('property_images')
    op.drop_table('properties')
    op.drop_table('users')
    
    # Drop enum types
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=False)
    sa.Enum(name='propertytype').drop(op.get_bind(), checkfirst=False)
    sa.Enum(name='transactiontype').drop(op.get_bind(), checkfirst=False)
    sa.Enum(name='propertystatus').drop(op.get_bind(), checkfirst=False)
