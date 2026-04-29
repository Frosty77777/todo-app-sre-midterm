output "instance_public_ip" {
  value = aws_instance.todo_ec2.public_ip
}

output "instance_public_dns" {
  value = aws_instance.todo_ec2.public_dns
}

output "security_group_id" {
  value = aws_security_group.todo_sg.id
}
