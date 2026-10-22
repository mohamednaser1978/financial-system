from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
try:
    from .database import Base
except ImportError:
    from database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    fullName = Column(String)
    role = Column(String, default="branch") # admin, branch
    officeId = Column(String, ForeignKey("offices.id"), nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    office = relationship("Office", back_populates="users")

class Office(Base):
    __tablename__ = "offices"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    code = Column(String, unique=True, index=True)
    type = Column(String, default="internal") # internal, external
    region = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    openingBalance = Column(Float, default=0.0)
    currentBalance = Column(Float, default=0.0)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    users = relationship("User", back_populates="office")
    sentTransfers = relationship("Transfer", foreign_keys="Transfer.senderOfficeId", back_populates="senderOffice")
    receivedTransfers = relationship("Transfer", foreign_keys="Transfer.receiverOfficeId", back_populates="receiverOffice")

class Transfer(Base):
    __tablename__ = "transfers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    transferNo = Column(String, unique=True, index=True)
    senderOfficeId = Column(String, ForeignKey("offices.id"))
    receiverOfficeId = Column(String, ForeignKey("offices.id"))
    intermediaryOfficeId = Column(String, ForeignKey("offices.id"), nullable=True)
    amount = Column(Float)
    commissionAmount = Column(Float)
    transferType = Column(String) # internal, external, intermediary
    status = Column(String, default="pending") # pending, completed, cancelled
    senderName = Column(String, nullable=True)
    senderPhone = Column(String, nullable=True)
    receiverName = Column(String, nullable=True)
    receiverPhone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    adminNote = Column(String, nullable=True)
    isVerified = Column(Boolean, default=False)
    verifiedBy = Column(String, nullable=True)
    createdBy = Column(String)
    createdAt = Column(DateTime, default=datetime.utcnow)
    completedAt = Column(DateTime, nullable=True)

    senderOffice = relationship("Office", foreign_keys=[senderOfficeId], back_populates="sentTransfers")
    receiverOffice = relationship("Office", foreign_keys=[receiverOfficeId], back_populates="receivedTransfers")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    description = Column(String)
    amount = Column(Float)
    expenseDate = Column(DateTime, default=datetime.utcnow)
    category = Column(String, nullable=True) # General, Salary, Rent, etc.
    notes = Column(String, nullable=True)
    officeId = Column(String, ForeignKey("offices.id"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    createdBy = Column(String, nullable=True)

    office = relationship("Office")

class CommissionRule(Base):
    __tablename__ = "commission_rules"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    type = Column(String) # percentage, fixed
    transferType = Column(String) # internal, external
    value = Column(Float)
    minAmount = Column(Float, nullable=True)
    maxAmount = Column(Float, nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    distributionRules = relationship("DistributionRule", back_populates="commissionRule", cascade="all, delete-orphan")

class DistributionRule(Base):
    __tablename__ = "distribution_rules"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    commissionRuleId = Column(String, ForeignKey("commission_rules.id"))
    partyType = Column(String) # sender, receiver, intermediary, company
    percentage = Column(Float) # percentage of the commission
    
    commissionRule = relationship("CommissionRule", back_populates="distributionRules")

class Creditor(Base):
    __tablename__ = "creditors"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    phone = Column(String, nullable=True)
    totalDeposit = Column(Float, default=0.0)
    currentBalance = Column(Float, default=0.0)
    officeId = Column(String, ForeignKey("offices.id"))
    notes = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    office = relationship("Office")
    transactions = relationship("CreditorTransaction", back_populates="creditor", cascade="all, delete-orphan")

class CreditorTransaction(Base):
    __tablename__ = "creditor_transactions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    creditorId = Column(String, ForeignKey("creditors.id"))
    amount = Column(Float)
    type = Column(String) # deposit, withdraw
    description = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    creditor = relationship("Creditor", back_populates="transactions")

class Debtor(Base):
    __tablename__ = "debtors"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    phone = Column(String, nullable=True)
    totalDebt = Column(Float, default=0.0)
    currentBalance = Column(Float, default=0.0)
    officeId = Column(String, ForeignKey("offices.id"))
    notes = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    office = relationship("Office")
    transactions = relationship("DebtorTransaction", back_populates="debtor", cascade="all, delete-orphan")

class DebtorTransaction(Base):
    __tablename__ = "debtor_transactions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    debtorId = Column(String, ForeignKey("debtors.id"))
    amount = Column(Float)
    type = Column(String) # debt, payment
    description = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

    debtor = relationship("Debtor", back_populates="transactions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    action = Column(String)
    entity = Column(String)
    entityId = Column(String, nullable=True)
    entityName = Column(String, nullable=True)
    description = Column(String)
    userId = Column(String, nullable=True)
    userFullName = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
