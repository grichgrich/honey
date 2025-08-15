from setuptools import setup, find_packages

setup(
    name="enhanced_leverage_system",
    version="3.2.0",
    packages=find_packages(),
    install_requires=[
        "dataclasses",
        "typing-extensions",
        "pathlib"
    ],
    python_requires=">=3.8",
)