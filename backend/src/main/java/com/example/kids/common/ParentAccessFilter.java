package com.example.kids.common;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
@Component public class ParentAccessFilter implements Filter {
 private final String secret;
 public ParentAccessFilter(@Value("${parent.access-key:}") String secret){this.secret=secret;}
 @Override public void doFilter(ServletRequest request,ServletResponse response,FilterChain chain)throws IOException,ServletException {
  var req=(HttpServletRequest)request;var res=(HttpServletResponse)response;
  if(req.getRequestURI().startsWith("/api/v1/parent/")){
   byte[] a=secret.getBytes(StandardCharsets.UTF_8);
   byte[] b=req.getHeader("X-Parent-Key")==null?new byte[0]:req.getHeader("X-Parent-Key").getBytes(StandardCharsets.UTF_8);
   if(a.length==0||!MessageDigest.isEqual(a,b)){res.sendError(HttpStatus.UNAUTHORIZED.value(),"Parent access key missing or invalid");return;}
  }
  chain.doFilter(request,response);
 }
}