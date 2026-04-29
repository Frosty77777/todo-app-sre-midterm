variable "project_name" {
  type    = string
  default = "todo-microservices"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ubuntu_ami_id" {
  type        = string
  description = "Ubuntu Server AMI ID"
}

variable "key_name" {
  type        = string
  description = "AWS key pair name for SSH"
}
