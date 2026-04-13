"""Demo: classical RSA + ECDSA usage for QuantumSafe scanner."""

from cryptography.hazmat.primitives.asymmetric import rsa, ec
from cryptography.hazmat.primitives import hashes


def make_rsa():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def sign_ecdsa(private_key, data: bytes):
    return private_key.sign(data, ec.ECDSA(hashes.SHA256()))


def gen_ecdsa_key():
    return ec.generate_private_key(ec.SECP256R1())
